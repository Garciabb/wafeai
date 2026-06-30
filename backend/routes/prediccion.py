from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from models.socio import Socio, NivelRiesgo
from models.credito import Credito, EstadoCredito
from models.alerta import Alerta, TipoAlerta, PrioridadAlerta
from models.pago import Pago, EstadoPago
from ml.model import predictor
from routes.auth import get_usuario_actual
from models.user import Usuario

router = APIRouter(prefix="/api/prediccion", tags=["Predicción IA"])


class PrediccionRequest(BaseModel):
    dias_mora: int = 0
    monto_pendiente: float = 0.0
    ratio_cumplimiento: float = 1.0
    num_creditos: int = 1
    tipo_credito: str = "consumo"
    meses_cliente: int = 12
    porcentaje_deuda: float = 0.5


class PrediccionSocioRequest(BaseModel):
    socio_id: int


@router.post("/calcular", summary="Calcular score de riesgo con datos manuales")
def calcular_prediccion(
    datos: PrediccionRequest,
    usuario: Usuario = Depends(get_usuario_actual),
):
    """Calcula la probabilidad de incumplimiento dado los datos de un socio."""
    resultado = predictor.predecir(datos.model_dump())
    return resultado


@router.post("/socio/{socio_id}", summary="Calcular y actualizar score de riesgo de un socio")
def predecir_socio(
    socio_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    """Calcula el score de riesgo de un socio usando sus datos reales de la BD."""
    socio = db.query(Socio).filter(Socio.id == socio_id, Socio.activo == True).first()
    if not socio:
        raise HTTPException(status_code=404, detail="Socio no encontrado")

    credito = socio.creditos.filter(
        Credito.estado == EstadoCredito.activo
    ).order_by(Credito.saldo_pendiente.desc()).first()

    pagos_totales = socio.pagos.count()
    pagos_a_tiempo = socio.pagos.filter(
        Pago.estado == EstadoPago.pagado,
        Pago.dias_retraso <= 5,
    ).count()

    ratio_cumplimiento = (pagos_a_tiempo / pagos_totales) if pagos_totales > 0 else 1.0
    num_creditos = socio.creditos.filter(Credito.estado == EstadoCredito.activo).count()

    datos = {
        "dias_mora": credito.dias_mora if credito else socio.dias_mora_maximo,
        "monto_pendiente": credito.saldo_pendiente if credito else 0,
        "ratio_cumplimiento": ratio_cumplimiento,
        "num_creditos": num_creditos or 1,
        "tipo_credito": credito.tipo if credito else "consumo",
        "meses_cliente": 12,
        "porcentaje_deuda": (
            (credito.saldo_pendiente / credito.monto_original)
            if credito and credito.monto_original > 0
            else 0.5
        ),
    }

    resultado = predictor.predecir(datos)

    # Actualizar score en BD
    score_anterior = socio.score_riesgo
    socio.score_riesgo = resultado["score_riesgo"]
    socio.nivel_riesgo = resultado["nivel_riesgo"]

    # Crear alerta si subió a riesgo alto
    if resultado["nivel_riesgo"] == "alto" and score_anterior < 70:
        alerta = Alerta(
            socio_id=socio_id,
            tipo=TipoAlerta.prediccion_ia,
            prioridad=PrioridadAlerta.urgente,
            mensaje=(f"IA detectó riesgo ALTO para {socio.nombre} {socio.apellido}. "
                     f"Score: {resultado['score_riesgo']}%. "
                     f"Factores: {', '.join(resultado['factores_riesgo'])}"),
        )
        db.add(alerta)

    db.commit()

    return {
        "socio_id": socio_id,
        "nombre": f"{socio.nombre} {socio.apellido}",
        **resultado,
    }


@router.post("/recalcular-todos", summary="Recalcular scores de riesgo de todos los socios")
def recalcular_todos(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    """Recalcula el score de riesgo de todos los socios activos. Solo administradores."""
    if usuario.rol != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores pueden ejecutar esta acción")

    socios = db.query(Socio).filter(Socio.activo == True).all()
    actualizados = 0

    for socio in socios:
        credito = socio.creditos.filter(Credito.estado == EstadoCredito.activo).first()
        pagos_totales = socio.pagos.count()
        pagos_a_tiempo = socio.pagos.filter(Pago.estado == EstadoPago.pagado, Pago.dias_retraso <= 5).count()

        datos = {
            "dias_mora": credito.dias_mora if credito else socio.dias_mora_maximo,
            "monto_pendiente": credito.saldo_pendiente if credito else 0,
            "ratio_cumplimiento": (pagos_a_tiempo / pagos_totales) if pagos_totales > 0 else 1.0,
            "num_creditos": socio.creditos.filter(Credito.estado == EstadoCredito.activo).count() or 1,
            "tipo_credito": credito.tipo if credito else "consumo",
            "meses_cliente": 12,
            "porcentaje_deuda": (credito.saldo_pendiente / credito.monto_original if credito and credito.monto_original > 0 else 0.5),
        }

        resultado = predictor.predecir(datos)
        socio.score_riesgo = resultado["score_riesgo"]
        socio.nivel_riesgo = resultado["nivel_riesgo"]
        actualizados += 1

    db.commit()
    return {"mensaje": f"Scores actualizados para {actualizados} socios"}


@router.post("/entrenar", summary="Re-entrenar modelo con datos actuales de la BD")
def entrenar_modelo(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    """Entrena el modelo ML con los datos históricos de la base de datos."""
    if usuario.rol != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores")

    socios = db.query(Socio).filter(Socio.activo == True).all()
    if len(socios) < 20:
        raise HTTPException(status_code=400, detail="Se necesitan al menos 20 socios para entrenar")

    datos_entrenamiento = []
    for socio in socios:
        credito = socio.creditos.filter(Credito.estado == EstadoCredito.activo).first()
        pagos_totales = socio.pagos.count()
        pagos_a_tiempo = socio.pagos.filter(Pago.estado == EstadoPago.pagado, Pago.dias_retraso <= 5).count()

        tipo_map = {"microcredito": 0, "consumo": 1, "vivienda": 2, "empresarial": 3}

        datos_entrenamiento.append({
            "dias_mora": credito.dias_mora if credito else socio.dias_mora_maximo,
            "monto_pendiente_mm": (credito.saldo_pendiente / 1_000_000) if credito else 0,
            "ratio_cumplimiento": (pagos_a_tiempo / pagos_totales) if pagos_totales > 0 else 1.0,
            "num_creditos": socio.creditos.filter(Credito.estado == EstadoCredito.activo).count() or 1,
            "tipo_credito": tipo_map.get(credito.tipo if credito else "consumo", 1),
            "meses_cliente": 12,
            "porcentaje_deuda": (credito.saldo_pendiente / credito.monto_original if credito and credito.monto_original > 0 else 0.5),
            "es_alto_riesgo": 1 if socio.nivel_riesgo == NivelRiesgo.alto else 0,
        })

    resultado = predictor.entrenar(datos_entrenamiento)
    return {"mensaje": "Modelo entrenado exitosamente", "metricas": resultado}
