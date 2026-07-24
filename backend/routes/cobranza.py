from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from database import get_db
from models.socio import Socio, NivelRiesgo
from models.credito import Credito, EstadoCredito
from models.comunicacion import Comunicacion, TipoComunicacion, EstadoComunicacion
from services.email_service import enviar_email
from services.whatsapp_service import enviar_whatsapp_texto, generar_mensaje_cobranza
from routes.auth import get_usuario_actual
from models.user import Usuario

router = APIRouter(prefix="/api/cobranza", tags=["Cobranza Automatizada"])


class EnvioEmailRequest(BaseModel):
    socio_id: int
    plantilla: str = "recordatorio_pago"
    variables_extra: Optional[dict] = {}
    asunto_custom: Optional[str] = None
    cuerpo_html_custom: Optional[str] = None
    cc: Optional[list] = []


class EnvioWhatsAppRequest(BaseModel):
    socio_id: int
    mensaje_personalizado: Optional[str] = None


class CampanaRequest(BaseModel):
    nivel_riesgo: NivelRiesgo
    tipo_mensaje: str = "email"   # "email" | "whatsapp" | "ambos"
    plantilla: str = "recordatorio_pago"
    solo_preview: bool = False


@router.post("/enviar-email", summary="Enviar email de cobranza a un socio")
async def enviar_email_socio(
    data: EnvioEmailRequest,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    socio = db.query(Socio).filter(Socio.id == data.socio_id, Socio.activo == True).first()
    if not socio:
        raise HTTPException(status_code=404, detail="Socio no encontrado")

    credito = socio.creditos.filter(Credito.estado == EstadoCredito.activo).order_by(Credito.saldo_pendiente.desc()).first()
    dias = socio.dias_mora_maximo
    dias_mora_color = "#CC0000" if dias > 30 else "#E67E00" if dias > 0 else "#00A67E"
    variables = {
        "cooperativa": "Cooperativa Financiera",
        "monto": f"${credito.saldo_pendiente:,.0f} COP" if credito else "N/A",
        "fecha_vencimiento": credito.fecha_vencimiento.strftime("%d/%m/%Y") if credito else "N/A",
        "dias_mora": str(dias),
        "dias_mora_color": dias_mora_color,
        **(data.variables_extra or {}),
    }

    resultado = await enviar_email(
        destinatario_email=socio.email,
        destinatario_nombre=socio.nombre,
        plantilla=data.plantilla,
        variables=variables,
        asunto_custom=data.asunto_custom,
        cuerpo_html_custom=data.cuerpo_html_custom,
        cc=data.cc or [],
    )

    estado = EstadoComunicacion.enviado if resultado.get("enviado") else EstadoComunicacion.fallido
    comunicacion = Comunicacion(
        socio_id=socio.id,
        usuario_id=usuario.id,
        tipo=TipoComunicacion.email,
        asunto=data.asunto_custom or f"Cobranza - {socio.nombre} {socio.apellido}",
        mensaje=(data.cuerpo_html_custom or f"Plantilla: {data.plantilla}")[:500],
        estado=estado,
        plantilla=data.plantilla,
    )
    db.add(comunicacion)
    db.commit()

    return {"enviado": resultado.get("enviado"), "detalle": resultado, "comunicacion_id": comunicacion.id}


@router.post("/enviar-whatsapp", summary="Enviar WhatsApp de cobranza a un socio")
async def enviar_whatsapp_socio(
    data: EnvioWhatsAppRequest,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    socio = db.query(Socio).filter(Socio.id == data.socio_id, Socio.activo == True).first()
    if not socio:
        raise HTTPException(status_code=404, detail="Socio no encontrado")

    if not socio.telefono or socio.telefono.strip() in ('', '0000000000'):
        raise HTTPException(status_code=400, detail="El socio no tiene un número de teléfono válido registrado")

    credito = socio.creditos.filter(Credito.estado == EstadoCredito.activo).order_by(Credito.saldo_pendiente.desc()).first()
    monto_str = f"${credito.saldo_pendiente:,.0f} COP" if credito else "$0 COP"

    mensaje = data.mensaje_personalizado or generar_mensaje_cobranza(
        nombre=socio.nombre,
        monto=monto_str,
        dias_mora=socio.dias_mora_maximo,
    )

    resultado = await enviar_whatsapp_texto(socio.telefono, mensaje)

    estado = EstadoComunicacion.enviado if resultado.get("enviado") else EstadoComunicacion.fallido
    comunicacion = Comunicacion(
        socio_id=socio.id,
        usuario_id=usuario.id,
        tipo=TipoComunicacion.whatsapp,
        mensaje=mensaje,
        estado=estado,
    )
    db.add(comunicacion)
    db.commit()

    return {"enviado": resultado.get("enviado"), "detalle": resultado, "comunicacion_id": comunicacion.id}


@router.post("/campana", summary="Lanzar campaña masiva de cobranza")
async def lanzar_campana(
    data: CampanaRequest,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    """Envía mensajes de cobranza a todos los socios con el nivel de riesgo especificado."""
    socios = db.query(Socio).filter(
        Socio.activo == True,
        Socio.nivel_riesgo == data.nivel_riesgo,
    ).all()

    if data.solo_preview:
        return {
            "preview": True,
            "socios_afectados": len(socios),
            "tipo_mensaje": data.tipo_mensaje,
            "socios": [{"id": s.id, "nombre": f"{s.nombre} {s.apellido}", "email": s.email, "telefono": s.telefono} for s in socios[:10]],
        }

    enviados, fallidos, sin_telefono = 0, 0, 0

    for socio in socios:
        credito = socio.creditos.filter(Credito.estado == EstadoCredito.activo).order_by(Credito.saldo_pendiente.desc()).first()
        dias = socio.dias_mora_maximo
        variables = {
            "cooperativa": "Cooperativa Financiera",
            "monto": f"${credito.saldo_pendiente:,.0f} COP" if credito else "N/A",
            "fecha_vencimiento": credito.fecha_vencimiento.strftime("%d/%m/%Y") if credito else "N/A",
            "dias_mora": str(dias),
            "dias_mora_color": "#CC0000" if dias > 30 else "#E67E00" if dias > 0 else "#00A67E",
        }

        if data.tipo_mensaje in ("email", "ambos"):
            resultado_email = await enviar_email(
                socio.email, socio.nombre, data.plantilla, variables
            )
            estado_e = EstadoComunicacion.enviado if resultado_email.get("enviado") else EstadoComunicacion.fallido
            db.add(Comunicacion(
                socio_id=socio.id, usuario_id=usuario.id,
                tipo=TipoComunicacion.email, mensaje=f"Campaña: {data.plantilla}",
                estado=estado_e, plantilla=data.plantilla,
            ))
            if resultado_email.get("enviado"):
                enviados += 1
            else:
                fallidos += 1

        if data.tipo_mensaje in ("whatsapp", "ambos"):
            if not socio.telefono or socio.telefono.strip() in ('', '0000000000'):
                sin_telefono += 1
            else:
                monto_str = f"${credito.saldo_pendiente:,.0f} COP" if credito else "$0"
                msg = generar_mensaje_cobranza(socio.nombre, monto_str, socio.dias_mora_maximo)
                resultado_wa = await enviar_whatsapp_texto(socio.telefono, msg)
                estado_w = EstadoComunicacion.enviado if resultado_wa.get("enviado") else EstadoComunicacion.fallido
                db.add(Comunicacion(
                    socio_id=socio.id, usuario_id=usuario.id,
                    tipo=TipoComunicacion.whatsapp, mensaje=msg, estado=estado_w,
                ))
                if resultado_wa.get("enviado"):
                    enviados += 1
                else:
                    fallidos += 1

    db.commit()
    # Detectar si fue modo demo (todos los envíos tienen demo=True)
    es_demo = enviados > 0 and fallidos == 0  # heurística: éxito total = demo o real exitoso
    return {
        "total_socios": len(socios),
        "enviados": enviados,
        "fallidos": fallidos,
        "sin_telefono": sin_telefono,
        "demo": es_demo,
    }


@router.get("/historial/{socio_id}", summary="Historial de comunicaciones de un socio")
def historial_comunicaciones(
    socio_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    comunicaciones = db.query(Comunicacion).filter(
        Comunicacion.socio_id == socio_id
    ).order_by(Comunicacion.created_at.desc()).all()

    return [
        {
            "id": c.id,
            "tipo": c.tipo,
            "asunto": c.asunto,
            "mensaje": c.mensaje[:100] + "..." if c.mensaje and len(c.mensaje) > 100 else c.mensaje,
            "estado": c.estado,
            "plantilla": c.plantilla,
            "fecha": c.created_at.isoformat() if c.created_at else None,
        }
        for c in comunicaciones
    ]
