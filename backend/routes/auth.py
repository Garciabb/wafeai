from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import bcrypt
from collections import defaultdict
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models.user import Usuario
from config import get_settings

settings = get_settings()
router = APIRouter(prefix="/api/auth", tags=["Autenticacion"])

# Protección contra fuerza bruta — en producción usar Redis
_intentos_fallidos: dict[str, list] = defaultdict(list)
MAX_INTENTOS = 5
VENTANA_SEGUNDOS = 300  # 5 minutos


def _verificar_rate_limit(ip: str):
    ahora = datetime.now(timezone.utc)
    corte = ahora - timedelta(seconds=VENTANA_SEGUNDOS)
    _intentos_fallidos[ip] = [t for t in _intentos_fallidos[ip] if t > corte]
    if len(_intentos_fallidos[ip]) >= MAX_INTENTOS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Demasiados intentos fallidos. Espera {VENTANA_SEGUNDOS // 60} minutos.",
        )


def _registrar_intento_fallido(ip: str):
    _intentos_fallidos[ip].append(datetime.now(timezone.utc))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


class Token(BaseModel):
    access_token: str
    token_type: str
    usuario: dict


class UsuarioResponse(BaseModel):
    id: int
    email: str
    nombre: str
    apellido: str
    rol: str

    class Config:
        from_attributes = True


def verificar_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def crear_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode["exp"] = expire
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def get_usuario_actual(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Usuario:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token invalido o expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if not email:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    usuario = db.query(Usuario).filter(Usuario.email == email, Usuario.activo == True).first()
    if not usuario:
        raise credentials_exception
    return usuario


@router.post("/login", response_model=Token, summary="Iniciar sesion")
def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Autenticacion con email y contrasena. Devuelve JWT."""
    ip = request.client.host if request.client else "unknown"
    _verificar_rate_limit(ip)

    usuario = db.query(Usuario).filter(
        Usuario.email == form_data.username,
        Usuario.activo == True,
    ).first()

    if not usuario or not verificar_password(form_data.password, usuario.hashed_password):
        _registrar_intento_fallido(ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contrasena incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = crear_token({"sub": usuario.email, "rol": usuario.rol})
    return {
        "access_token": token,
        "token_type": "bearer",
        "usuario": {
            "id": usuario.id,
            "email": usuario.email,
            "nombre": usuario.nombre,
            "apellido": usuario.apellido,
            "rol": usuario.rol,
        },
    }


@router.get("/me", response_model=UsuarioResponse, summary="Perfil del usuario actual")
def get_me(usuario: Usuario = Depends(get_usuario_actual)):
    return usuario
