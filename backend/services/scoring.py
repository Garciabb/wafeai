from datetime import date
from sqlalchemy.orm import Session

from models.socio import Socio, EstadoMora
from models.credito import Credito, EstadoCredito
from models.pago import Pago, EstadoPago
from ml.model import predictor


def _estado_mora_desde_dias(dias_mora: int) -> EstadoMora:
    if dias_mora > 90:
        return EstadoMora.cartera_vencida
    elif dias_mora > 30:
        return EstadoMora.mora_avanzada
    elif dias_mora > 0:
        return EstadoMora.mora_temprana
    return EstadoMora.al_dia


def _meses_cliente(socio: Socio) -> int:
    if not socio.fecha_ingreso:
        return 12
    return max((date.today() - socio.fecha_ingreso).days // 30, 0)


def calcular_y_guardar_score(socio: Socio, db: Session) -> dict:
    """Calcula el score de riesgo IA de un socio con sus datos reales de la BD
    y actualiza score_riesgo, nivel_riesgo, estado_mora y dias_mora_maximo.

    No hace db.commit() — el llamador es responsable de confirmar la
    transacción (junto con cualquier otro cambio que haga en el mismo request).
    """
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
    dias_mora = credito.dias_mora if credito else socio.dias_mora_maximo

    datos = {
        "dias_mora": dias_mora,
        "monto_pendiente": credito.saldo_pendiente if credito else 0,
        "ratio_cumplimiento": ratio_cumplimiento,
        "num_creditos": num_creditos or 1,
        "tipo_credito": credito.tipo if credito else "consumo",
        "meses_cliente": _meses_cliente(socio),
        "porcentaje_deuda": (
            (credito.saldo_pendiente / credito.monto_original)
            if credito and credito.monto_original > 0
            else 0.5
        ),
    }

    resultado = predictor.predecir(datos)

    socio.score_riesgo = resultado["score_riesgo"]
    socio.nivel_riesgo = resultado["nivel_riesgo"]
    socio.estado_mora = _estado_mora_desde_dias(dias_mora)
    socio.dias_mora_maximo = max(socio.dias_mora_maximo or 0, dias_mora)

    return resultado
