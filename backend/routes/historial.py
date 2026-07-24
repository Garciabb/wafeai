from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import date
from typing import Optional

from database import get_db
from models.evento_historial import EventoHistorial, TipoEvento
from models.socio import Socio
from routes.auth import get_usuario_actual
from models.user import Usuario

router = APIRouter(prefix="/api/historial", tags=["Historial de Contexto"])


def _dict(e: EventoHistorial) -> dict:
    return {
        "id": e.id,
        "socio_id": e.socio_id,
        "tipo": e.tipo,
        "descripcion": e.descripcion,
        "fecha": e.fecha.isoformat(),
        "usuario_nombre": e.usuario.nombre if e.usuario else None,
        "created_at": e.created_at.isoformat() if e.created_at else None,
    }


class EventoCreate(BaseModel):
    socio_id: int
    tipo: TipoEvento
    descripcion: str
    fecha: date


@router.get("/", summary="Listar eventos del historial de contexto de un socio")
def listar_eventos(
    socio_id: int = Query(...),
    limite: int = Query(default=100, le=300),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    eventos = db.query(EventoHistorial).filter(
        EventoHistorial.socio_id == socio_id
    ).order_by(EventoHistorial.fecha.desc(), EventoHistorial.id.desc()).limit(limite).all()
    return [_dict(e) for e in eventos]


@router.post("/", summary="Registrar evento en el historial de contexto")
def crear_evento(
    data: EventoCreate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    socio = db.query(Socio).filter(Socio.id == data.socio_id, Socio.activo == True).first()
    if not socio:
        raise HTTPException(status_code=404, detail="Socio no encontrado")

    descripcion = data.descripcion.strip()
    if not descripcion:
        raise HTTPException(status_code=422, detail="La descripción no puede estar vacía")

    evento = EventoHistorial(
        socio_id=data.socio_id,
        usuario_id=usuario.id,
        tipo=data.tipo,
        descripcion=descripcion[:500],
        fecha=data.fecha,
    )
    db.add(evento)
    db.commit()
    db.refresh(evento)
    return _dict(evento)


@router.delete("/{evento_id}", summary="Eliminar evento del historial de contexto")
def eliminar_evento(
    evento_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    evento = db.query(EventoHistorial).filter(EventoHistorial.id == evento_id).first()
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    db.delete(evento)
    db.commit()
    return {"ok": True}
