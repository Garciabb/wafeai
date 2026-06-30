from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import date, timedelta
from database import get_db
from models.socio import Socio, NivelRiesgo, EstadoMora
from models.credito import Credito, EstadoCredito
from models.pago import Pago, EstadoPago
from models.alerta import Alerta
from routes.auth import get_usuario_actual
from models.user import Usuario

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/kpis", summary="KPIs principales de la cartera")
def get_kpis(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    """Devuelve los KPIs principales: cartera total, vencida, tasa de recupero y alertas."""
    cartera_total = db.query(func.sum(Credito.saldo_pendiente)).filter(
        Credito.estado == EstadoCredito.activo
    ).scalar() or 0

    cartera_vencida = db.query(func.sum(Credito.saldo_pendiente)).filter(
        Credito.estado == EstadoCredito.activo,
        Credito.dias_mora > 30,
    ).scalar() or 0

    hace_30_dias = date.today() - timedelta(days=30)
    recupero_mes = db.query(func.sum(Pago.monto)).filter(
        Pago.estado == EstadoPago.pagado,
        Pago.fecha_pago >= hace_30_dias,
    ).scalar() or 0

    tasa_recupero = round((recupero_mes / cartera_vencida * 100), 1) if cartera_vencida > 0 else 0

    alertas_activas = db.query(func.count(Alerta.id)).filter(
        Alerta.prioridad == 'urgente'
    ).scalar() or 0

    socios_en_riesgo = db.query(func.count(Socio.id)).filter(
        Socio.nivel_riesgo == NivelRiesgo.alto
    ).scalar() or 0

    total_socios = db.query(func.count(Socio.id)).filter(Socio.activo == True).scalar() or 1
    socios_mora = db.query(func.count(Socio.id)).filter(
        Socio.estado_mora != EstadoMora.al_dia,
        Socio.activo == True,
    ).scalar() or 0

    return {
        "cartera_total": round(cartera_total, 0),
        "cartera_vencida": round(cartera_vencida, 0),
        "recupero_mes": round(recupero_mes, 0),
        "tasa_recupero": tasa_recupero,
        "alertas_activas": alertas_activas,
        "socios_en_riesgo_alto": socios_en_riesgo,
        "socios_en_mora": socios_mora,
        "total_socios": total_socios,
        "porcentaje_mora": round(socios_mora / total_socios * 100, 1),
    }


@router.get("/evolucion-cartera", summary="Evolución cartera vencida últimos 6 meses")
def get_evolucion_cartera(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    """Retorna datos mensuales de evolución de cartera para la gráfica principal."""
    meses = []
    hoy = date.today()

    for i in range(5, -1, -1):
        mes_inicio = date(hoy.year, hoy.month, 1) - timedelta(days=30 * i)
        if mes_inicio.month == 12:
            mes_fin = date(mes_inicio.year + 1, 1, 1) - timedelta(days=1)
        else:
            mes_fin = date(mes_inicio.year, mes_inicio.month + 1, 1) - timedelta(days=1)

        total_mes = db.query(func.sum(Credito.saldo_pendiente)).filter(
            Credito.fecha_desembolso <= mes_fin,
        ).scalar() or 0

        vencida_mes = db.query(func.sum(Credito.saldo_pendiente)).filter(
            Credito.fecha_desembolso <= mes_fin,
            Credito.dias_mora > 30,
        ).scalar() or 0

        meses.append({
            "mes": mes_inicio.strftime("%b %Y"),
            "cartera_total": round(total_mes / 1_000_000, 1),     # En millones COP
            "cartera_vencida": round(vencida_mes / 1_000_000, 1),
        })

    return meses


@router.get("/socios-alto-riesgo", summary="Top socios con mayor score de riesgo IA")
def get_socios_alto_riesgo(
    limite: int = Query(default=10, ge=1, le=50),   # máximo 50
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    """Retorna los socios con mayor probabilidad de incumplimiento según la IA."""
    socios = db.query(Socio).filter(
        Socio.activo == True,
        Socio.nivel_riesgo.in_([NivelRiesgo.alto, NivelRiesgo.medio]),
    ).order_by(Socio.score_riesgo.desc()).limit(limite).all()

    resultado = []
    for s in socios:
        credito_activo = s.creditos.filter(
            Credito.estado == EstadoCredito.activo
        ).order_by(Credito.saldo_pendiente.desc()).first()

        resultado.append({
            "id": s.id,
            "nombre": f"{s.nombre} {s.apellido}",
            "cedula": s.cedula,
            "ciudad": s.ciudad,
            "score_riesgo": s.score_riesgo,
            "nivel_riesgo": s.nivel_riesgo,
            "estado_mora": s.estado_mora,
            "dias_mora": s.dias_mora_maximo,
            "saldo_pendiente": credito_activo.saldo_pendiente if credito_activo else 0,
            "tipo_credito": credito_activo.tipo if credito_activo else None,
        })

    return resultado


@router.get("/actividad-reciente", summary="Feed de actividad reciente")
def get_actividad_reciente(
    limite: int = Query(default=20, ge=1, le=100),  # máximo 100
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    """Retorna alertas y eventos recientes para el feed de actividad."""
    alertas = db.query(Alerta).join(Socio).order_by(
        Alerta.created_at.desc()
    ).limit(limite).all()

    return [
        {
            "id": a.id,
            "tipo": a.tipo,
            "prioridad": a.prioridad,
            "mensaje": a.mensaje,
            "leida": a.leida,
            "socio": f"{a.socio.nombre} {a.socio.apellido}",
            "socio_id": a.socio_id,
            "fecha": a.created_at.isoformat() if a.created_at else None,
        }
        for a in alertas
    ]


@router.get("/resumen-riesgo", summary="Distribución del riesgo en la cartera")
def get_resumen_riesgo(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    """Retorna la distribución de socios por nivel de riesgo."""
    bajo = db.query(func.count(Socio.id)).filter(Socio.nivel_riesgo == NivelRiesgo.bajo, Socio.activo == True).scalar() or 0
    medio = db.query(func.count(Socio.id)).filter(Socio.nivel_riesgo == NivelRiesgo.medio, Socio.activo == True).scalar() or 0
    alto = db.query(func.count(Socio.id)).filter(Socio.nivel_riesgo == NivelRiesgo.alto, Socio.activo == True).scalar() or 0
    total = bajo + medio + alto or 1

    return {
        "bajo": {"cantidad": bajo, "porcentaje": round(bajo / total * 100, 1)},
        "medio": {"cantidad": medio, "porcentaje": round(medio / total * 100, 1)},
        "alto": {"cantidad": alto, "porcentaje": round(alto / total * 100, 1)},
    }
