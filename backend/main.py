from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from database import Base, engine, SessionLocal
from routes import auth, dashboard, socios, prediccion, cobranza, alertas, promesas, ia, historial
from config import get_settings

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)

    # En hosts con disco efímero (p.ej. Render free tier) la BD se reinicia
    # vacía en cada redeploy/spin-up. Si no hay socios, repuebla con la demo
    # curada para que el enlace siempre funcione sin intervención manual.
    from models.socio import Socio
    from models.user import Usuario
    import bcrypt
    db = SessionLocal()
    try:
        if db.query(Socio).count() == 0:
            import seed
            seed.main()

        # Migración puntual: la cuenta demo original (Adriana) se reemplaza
        # por la cuenta personal del dueño de la app en cualquier BD existente.
        cuenta_vieja = db.query(Usuario).filter(Usuario.email == "adrianaarchilaq@gmail.com").first()
        if cuenta_vieja:
            cuenta_vieja.email = "wafeai.jg@gmail.com"
            cuenta_vieja.nombre = "Admin"
            cuenta_vieja.apellido = "WafeAI"
            cuenta_vieja.hashed_password = bcrypt.hashpw("wafe2026#".encode(), bcrypt.gensalt()).decode()
            db.commit()
    finally:
        db.close()

    yield


app = FastAPI(
    title="WafeAI API",
    description="Plataforma de gestión de cartera vencida con IA para cooperativas financieras",
    version="1.0.0",
    lifespan=lifespan,
    # /docs y /redoc solo disponibles en modo DEBUG — nunca en producción
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
)

# CORS estricto — solo orígenes y métodos necesarios
ALLOWED_ORIGINS = [settings.FRONTEND_URL]
if settings.DEBUG:
    ALLOWED_ORIGINS += ["http://localhost:5173", "http://127.0.0.1:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


# Headers de seguridad HTTP en todas las respuestas
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    if not settings.DEBUG:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(socios.router)
app.include_router(prediccion.router)
app.include_router(cobranza.router)
app.include_router(alertas.router)
app.include_router(promesas.router)
app.include_router(ia.router)
app.include_router(historial.router)


@app.get("/", tags=["Health"])
def root():
    # No revelar versión ni rutas en producción
    return {"status": "ok"}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}
