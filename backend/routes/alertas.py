from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import List, Optional
import json
import asyncio
from jose import JWTError, jwt
from database import get_db
from models.alerta import Alerta, TipoAlerta, PrioridadAlerta
from models.socio import Socio
from routes.auth import get_usuario_actual
from models.user import Usuario
from config import get_settings

settings = get_settings()
PRIORIDADES_VALIDAS = {p.value for p in PrioridadAlerta}

router = APIRouter(prefix="/api/alertas", tags=["Alertas y Notificaciones"])

# Gestor de conexiones WebSocket activas
class ConexionManager:
    def __init__(self):
        self.activas: List[WebSocket] = []

    async def conectar(self, ws: WebSocket):
        await ws.accept()
        self.activas.append(ws)

    def desconectar(self, ws: WebSocket):
        if ws in self.activas:
            self.activas.remove(ws)

    async def broadcast(self, mensaje: dict):
        desconectados = []
        for ws in self.activas:
            try:
                await ws.send_text(json.dumps(mensaje))
            except Exception:
                desconectados.append(ws)
        for ws in desconectados:
            self.desconectar(ws)


manager = ConexionManager()


@router.websocket("/ws")
async def websocket_alertas(websocket: WebSocket, token: str = Query(...)):
    """WebSocket para notificaciones en tiempo real — requiere token JWT como query param."""
    # Validar token antes de aceptar la conexión
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email = payload.get("sub")
        if not email:
            await websocket.close(code=4001, reason="Token inválido")
            return
    except JWTError:
        await websocket.close(code=4001, reason="Token inválido o expirado")
        return

    await manager.conectar(websocket)
    try:
        while True:
            await asyncio.sleep(30)
            await websocket.send_text(json.dumps({"tipo": "ping"}))
    except WebSocketDisconnect:
        manager.desconectar(websocket)


@router.get("/", summary="Listar alertas")
def listar_alertas(
    solo_no_leidas: bool = False,
    prioridad: Optional[str] = Query(default=None),
    limite: int = Query(default=50, ge=1, le=200),   # cap a 200 máximo
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    # Validar prioridad contra enum — evita inyección de valores arbitrarios
    if prioridad and prioridad not in PRIORIDADES_VALIDAS:
        raise HTTPException(status_code=422, detail=f"Prioridad inválida. Valores permitidos: {PRIORIDADES_VALIDAS}")

    query = db.query(Alerta).join(Socio)

    if solo_no_leidas:
        query = query.filter(Alerta.leida == False)
    if prioridad:
        query = query.filter(Alerta.prioridad == prioridad)

    alertas = query.order_by(Alerta.created_at.desc()).limit(limite).all()

    return [
        {
            "id": a.id,
            "tipo": a.tipo,
            "prioridad": a.prioridad,
            "mensaje": a.mensaje,
            "leida": a.leida,
            "socio_id": a.socio_id,
            "socio": f"{a.socio.nombre} {a.socio.apellido}",
            "fecha": a.created_at.isoformat() if a.created_at else None,
        }
        for a in alertas
    ]


@router.patch("/{alerta_id}/leer", summary="Marcar alerta como leída")
def marcar_leida(
    alerta_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    alerta = db.query(Alerta).filter(Alerta.id == alerta_id).first()
    if not alerta:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")
    alerta.leida = True
    db.commit()
    return {"mensaje": "Alerta marcada como leída"}


@router.patch("/leer-todas", summary="Marcar todas las alertas como leídas")
def marcar_todas_leidas(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    db.query(Alerta).filter(Alerta.leida == False).update({"leida": True})
    db.commit()
    return {"mensaje": "Todas las alertas marcadas como leídas"}


@router.get("/contador", summary="Contador de alertas no leídas")
def contar_alertas(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    total = db.query(Alerta).filter(Alerta.leida == False).count()
    urgentes = db.query(Alerta).filter(
        Alerta.leida == False,
        Alerta.prioridad == PrioridadAlerta.urgente,
    ).count()
    return {"total": total, "urgentes": urgentes}
