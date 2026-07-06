from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, field_validator
from datetime import date, datetime
from typing import Optional

from database import get_db
from models.promesa_pago import PromesaPago, EstadoPromesa
from models.socio import Socio
from routes.auth import get_usuario_actual
from models.user import Usuario

router = APIRouter(prefix="/api/promesas", tags=["Promesas de Pago"])


def _dict(p: PromesaPago) -> dict:
    hoy = date.today()
    vencida = p.fecha_prometida < hoy and p.estado == EstadoPromesa.pendiente
    dias_restantes = (p.fecha_prometida - hoy).days
    return {
        "id": p.id,
        "socio_id": p.socio_id,
        "socio_nombre": f"{p.socio.nombre} {p.socio.apellido}" if p.socio else "",
        "usuario_id": p.usuario_id,
        "usuario_nombre": p.usuario.nombre if p.usuario else "",
        "monto_prometido": p.monto_prometido,
        "fecha_prometida": p.fecha_prometida.isoformat(),
        "nota": p.nota,
        "estado": p.estado,
        "vencida": vencida,
        "dias_restantes": dias_restantes,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


class PromesaCreate(BaseModel):
    socio_id: int
    monto_prometido: float
    fecha_prometida: date
    nota: Optional[str] = None

    @field_validator("monto_prometido")
    @classmethod
    def monto_positivo(cls, v):
        if v <= 0:
            raise ValueError("El monto debe ser mayor a 0")
        return v

    @field_validator("fecha_prometida")
    @classmethod
    def fecha_futura(cls, v):
        if v < date.today():
            raise ValueError("La fecha prometida no puede ser en el pasado")
        return v


class PromesaUpdate(BaseModel):
    estado: EstadoPromesa
    nota: Optional[str] = None


@router.post("/", summary="Registrar promesa de pago")
def crear_promesa(
    data: PromesaCreate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    socio = db.query(Socio).filter(Socio.id == data.socio_id, Socio.activo == True).first()
    if not socio:
        raise HTTPException(status_code=404, detail="Socio no encontrado")

    promesa = PromesaPago(
        socio_id=data.socio_id,
        usuario_id=usuario.id,
        monto_prometido=data.monto_prometido,
        fecha_prometida=data.fecha_prometida,
        nota=data.nota,
    )
    db.add(promesa)
    db.commit()
    db.refresh(promesa)
    return _dict(promesa)


@router.get("/", summary="Listar promesas")
def listar_promesas(
    socio_id: Optional[int] = None,
    estado: Optional[EstadoPromesa] = None,
    solo_vencidas: bool = False,
    limite: int = Query(default=50, le=200),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    query = db.query(PromesaPago)
    if socio_id:
        query = query.filter(PromesaPago.socio_id == socio_id)
    if estado:
        query = query.filter(PromesaPago.estado == estado)
    if solo_vencidas:
        query = query.filter(
            PromesaPago.fecha_prometida < date.today(),
            PromesaPago.estado == EstadoPromesa.pendiente,
        )
    promesas = query.order_by(PromesaPago.fecha_prometida.asc()).limit(limite).all()
    return [_dict(p) for p in promesas]


@router.get("/resumen", summary="Resumen de promesas para dashboard")
def resumen_promesas(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    hoy = date.today()
    pendientes = db.query(PromesaPago).filter(PromesaPago.estado == EstadoPromesa.pendiente).all()
    vencidas_hoy = [p for p in pendientes if p.fecha_prometida < hoy]
    vencen_hoy = [p for p in pendientes if p.fecha_prometida == hoy]
    proximas = [p for p in pendientes if p.fecha_prometida > hoy]

    return {
        "total_pendientes": len(pendientes),
        "vencidas": len(vencidas_hoy),
        "vencen_hoy": len(vencen_hoy),
        "proximas_7_dias": len([p for p in proximas if (p.fecha_prometida - hoy).days <= 7]),
        "monto_vencido": sum(p.monto_prometido for p in vencidas_hoy),
        "monto_vence_hoy": sum(p.monto_prometido for p in vencen_hoy),
        "promesas_vencen_hoy": [_dict(p) for p in vencen_hoy],
    }


@router.patch("/{promesa_id}", summary="Actualizar estado de promesa")
def actualizar_promesa(
    promesa_id: int,
    data: PromesaUpdate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    promesa = db.query(PromesaPago).filter(PromesaPago.id == promesa_id).first()
    if not promesa:
        raise HTTPException(status_code=404, detail="Promesa no encontrada")

    promesa.estado = data.estado
    if data.nota is not None:
        promesa.nota = data.nota
    promesa.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(promesa)
    return _dict(promesa)


@router.delete("/{promesa_id}", summary="Eliminar promesa")
def eliminar_promesa(
    promesa_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    promesa = db.query(PromesaPago).filter(PromesaPago.id == promesa_id).first()
    if not promesa:
        raise HTTPException(status_code=404, detail="Promesa no encontrada")
    db.delete(promesa)
    db.commit()
    return {"ok": True}
