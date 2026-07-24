"""
Script para poblar la base de datos de WafeAI con datos demo curados a mano:
12 socios de una cooperativa de ahorro y crédito de Santander, Colombia,
diseñados para la demo con Adriana Archila (gerente general).
"""
import sys
import os
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine, Base
from models.user import Usuario, RolUsuario
from models.socio import Socio, NivelRiesgo, EstadoMora
from models.credito import Credito, TipoCredito, EstadoCredito
from models.pago import Pago, EstadoPago
from models.alerta import Alerta, TipoAlerta, PrioridadAlerta
from models.promesa_pago import PromesaPago, EstadoPromesa
from models.evento_historial import EventoHistorial, TipoEvento
import bcrypt as _bcrypt

HOY = date.today()


def hash_password(pw: str) -> str:
    return _bcrypt.hashpw(pw.encode(), _bcrypt.gensalt()).decode()


def dias_atras(n: int) -> date:
    return HOY - timedelta(days=n)


def cuota_mensual(monto: float, tasa_anual: float, plazo_meses: int) -> float:
    r = tasa_anual / 12 / 100
    if r == 0:
        return round(monto / plazo_meses, -2)
    cuota = monto * (r * (1 + r) ** plazo_meses) / ((1 + r) ** plazo_meses - 1)
    return round(cuota, -2)


def nivel_desde_score(score: float) -> NivelRiesgo:
    if score >= 70:
        return NivelRiesgo.alto
    elif score >= 40:
        return NivelRiesgo.medio
    return NivelRiesgo.bajo


def estado_mora_desde_dias(dias: int) -> EstadoMora:
    if dias > 90:
        return EstadoMora.cartera_vencida
    elif dias > 30:
        return EstadoMora.mora_avanzada
    elif dias > 0:
        return EstadoMora.mora_temprana
    return EstadoMora.al_dia


def crear_credito(db, socio_id, tipo, monto, tasa, plazo, dias_mora, es_principal):
    """Crea un crédito. El principal tiene saldo = deuda_pct * monto; los
    secundarios (multi-crédito) llevan saldos más bajos y sin mora propia."""
    fecha_desembolso = dias_atras(plazo * 10)  # crédito ya avanzado en su plazo
    fecha_vencimiento = fecha_desembolso + timedelta(days=plazo * 30)
    saldo = monto if es_principal else round(monto * 0.55, -3)
    credito = Credito(
        socio_id=socio_id,
        tipo=tipo,
        monto_original=monto,
        saldo_pendiente=saldo,
        tasa_interes=tasa,
        plazo_meses=plazo,
        dias_mora=dias_mora if es_principal else 0,
        fecha_desembolso=fecha_desembolso,
        fecha_vencimiento=fecha_vencimiento,
        estado=EstadoCredito.activo,
        num_cuotas_total=plazo,
        num_cuotas_pagadas=max(0, plazo - 6),
    )
    db.add(credito)
    db.flush()
    return credito


def crear_pagos(db, socio_id, credito_id, ratio_cumplimiento: float, dias_mora: int, cuota: float, n: int = 10):
    """Genera n cuotas históricas con exactamente `ratio_cumplimiento` de
    pagos puntuales (dias_retraso <= 5), y refleja el estado de mora actual
    en la cuota más reciente."""
    n_puntuales = round(n * ratio_cumplimiento)
    for i in range(n):
        fecha_venc = dias_atras((n - i) * 30)
        es_la_ultima = i == n - 1

        if es_la_ultima and dias_mora > 0:
            # Cuota actual vencida — refleja la mora vigente del socio
            db.add(Pago(
                credito_id=credito_id, socio_id=socio_id,
                monto=cuota, fecha_pago=None, fecha_vencimiento_cuota=fecha_venc,
                estado=EstadoPago.vencido, dias_retraso=dias_mora,
            ))
            continue

        puntual = i < n_puntuales
        retraso = (0 if puntual else 12) if i % 2 == 0 else (2 if puntual else 20)
        db.add(Pago(
            credito_id=credito_id, socio_id=socio_id,
            monto=cuota, fecha_pago=fecha_venc + timedelta(days=retraso),
            fecha_vencimiento_cuota=fecha_venc,
            estado=EstadoPago.pagado, dias_retraso=retraso,
        ))


def crear_eventos(db, socio_id, eventos: list[tuple[int, str, str]]):
    """eventos: lista de (dias_atras, tipo, descripcion)"""
    for dias, tipo, descripcion in eventos:
        db.add(EventoHistorial(
            socio_id=socio_id,
            tipo=TipoEvento(tipo),
            descripcion=descripcion,
            fecha=dias_atras(dias),
        ))


# ══════════════════════════════════════════════════════════════════════════
# 12 SOCIOS — Cooperativa de Santander, Colombia
# ══════════════════════════════════════════════════════════════════════════
SOCIOS = [
    # ── RIESGO ALTO (3) — señal predictiva, aún sin mora consolidada ──────
    dict(
        bucket="alto", nombre="Jairo Enrique", apellido="Suárez Delgado",
        cedula="91234567", ciudad="Bucaramanga", telefono="3157012345",
        email="jairo.suarez@gmail.com", tipo=TipoCredito.consumo,
        monto=12_000_000, tasa=18.0, plazo=30, dias_mora=0,
        ratio=0.30, num_creditos=3, score=81.0,
        eventos=[
            (60, "contacto", "Se le llamó para orientarlo sobre el manejo responsable de varios créditos activos."),
            (25, "novedad", "Solicitó un tercer crédito de consumo pese a mantener saldos altos en los dos anteriores."),
            (5, "novedad", "El modelo de IA detectó un patrón de sobreendeudamiento; aún no registra mora."),
        ],
    ),
    dict(
        bucket="alto", nombre="Marisol", apellido="Contreras Ardila",
        cedula="63478912", ciudad="Floridablanca", telefono="3208765432",
        email="marisol.contreras@gmail.com", tipo=TipoCredito.microcredito,
        monto=8_500_000, tasa=24.0, plazo=18, dias_mora=3,
        ratio=0.35, num_creditos=3, score=92.9,
        eventos=[
            (40, "contacto", "Contacto telefónico de seguimiento rutinario; indicó estar al día."),
            (15, "novedad", "Aumentó el uso de sus 3 líneas de crédito activas en el último mes."),
            (2, "incumplimiento", "Primer atraso registrado: 3 días de mora en la cuota del microcrédito."),
        ],
    ),
    dict(
        bucket="alto", nombre="Wilson Alexander", apellido="Rueda Niño",
        cedula="91876543", ciudad="Girón", telefono="3112345678",
        email="wilson.rueda@gmail.com", tipo=TipoCredito.vivienda,
        monto=40_000_000, tasa=12.0, plazo=144, dias_mora=5,
        ratio=0.40, num_creditos=3, score=90.0,
        eventos=[
            (50, "contacto", "Visita de asesor para revisar el estado del crédito de vivienda."),
            (20, "novedad", "Solicitó dos créditos de consumo adicionales en el mismo mes."),
            (4, "incumplimiento", "Mora temprana de 5 días detectada en la cuota más reciente."),
        ],
    ),

    # ── RIESGO MEDIO (3) — atraso leve ─────────────────────────────────────
    dict(
        bucket="medio", nombre="Diana Carolina", apellido="Pabón Serrano",
        cedula="37654321", ciudad="San Gil", telefono="3226789012",
        email="diana.pabon@gmail.com", tipo=TipoCredito.consumo,
        monto=12_000_000, tasa=18.0, plazo=24, dias_mora=12,
        ratio=0.50, num_creditos=1, score=44.0,
        eventos=[
            (30, "pago", "Pagó la cuota del mes anterior con 6 días de retraso."),
            (15, "contacto", "Se le contactó por WhatsApp para recordar el pago próximo a vencer."),
            (2, "incumplimiento", "Cuota vencida hace 12 días, aún sin registrar el pago."),
        ],
    ),
    dict(
        bucket="medio", nombre="Fabián Ricardo", apellido="Amaya Cáceres",
        cedula="91345678", ciudad="Barrancabermeja", telefono="3134567890",
        email="fabian.amaya@gmail.com", tipo=TipoCredito.microcredito,
        monto=6_500_000, tasa=24.0, plazo=18, dias_mora=8,
        ratio=0.50, num_creditos=1, score=45.0,
        eventos=[
            (35, "pago", "Pago parcial registrado: cubrió el 70% del valor de la cuota."),
            (10, "contacto", "Llamada de seguimiento; indicó dificultades temporales de flujo de caja."),
            (1, "incumplimiento", "8 días de mora en la cuota del microcrédito."),
        ],
    ),
    dict(
        bucket="medio", nombre="Luz Marina", apellido="Ortiz Villamizar",
        cedula="63219876", ciudad="Piedecuesta", telefono="3198765432",
        email="luzmarina.ortiz@gmail.com", tipo=TipoCredito.vivienda,
        monto=28_000_000, tasa=12.5, plazo=120, dias_mora=18,
        ratio=0.45, num_creditos=1, score=47.5,
        eventos=[
            (45, "contacto", "Visita de cobranza preventiva antes del vencimiento de la cuota."),
            (18, "incumplimiento", "Cuota del crédito de vivienda quedó vencida."),
            (5, "contacto", "Se envió correo electrónico recordando el pago pendiente."),
        ],
    ),

    # ── RIESGO BAJO (3) — al día, buen historial ───────────────────────────
    dict(
        bucket="bajo", nombre="Camilo Andrés", apellido="Duarte Flórez",
        cedula="91567890", ciudad="Bucaramanga", telefono="3145678901",
        email="camilo.duarte@gmail.com", tipo=TipoCredito.consumo,
        monto=15_000_000, tasa=18.0, plazo=30, dias_mora=0,
        ratio=0.95, num_creditos=1, score=9.5,
        eventos=[
            (90, "pago", "Pago puntual de la cuota mensual."),
            (60, "pago", "Pago puntual; adelantó parte del abono a la siguiente cuota."),
            (30, "contacto", "Se comunicó para consultar sobre un nuevo producto de ahorro."),
        ],
    ),
    dict(
        bucket="bajo", nombre="Sandra Patricia", apellido="Mantilla Rojas",
        cedula="63987654", ciudad="Floridablanca", telefono="3009876543",
        email="sandra.mantilla@gmail.com", tipo=TipoCredito.microcredito,
        monto=4_200_000, tasa=24.0, plazo=12, dias_mora=0,
        ratio=1.0, num_creditos=1, score=5.0,
        eventos=[
            (75, "pago", "Pago puntual del microcrédito."),
            (45, "novedad", "Actualizó sus datos de contacto en la cooperativa."),
            (15, "pago", "Pago puntual registrado nuevamente."),
        ],
    ),
    dict(
        bucket="bajo", nombre="Álvaro José", apellido="Peñaranda Gómez",
        cedula="91678901", ciudad="Girón", telefono="3167890123",
        email="alvaro.penaranda@gmail.com", tipo=TipoCredito.vivienda,
        monto=45_000_000, tasa=12.0, plazo=168, dias_mora=0,
        ratio=0.90, num_creditos=1, score=14.0,
        eventos=[
            (100, "pago", "Pago puntual de la cuota del crédito de vivienda."),
            (50, "contacto", "Consultó sobre refinanciamiento a mejor tasa por su buen historial."),
            (10, "pago", "Pago puntual; mantiene un historial impecable."),
        ],
    ),

    # ── MORA ACTIVA (2) — días_mora > 30 ───────────────────────────────────
    dict(
        bucket="mora_activa", nombre="Reinaldo de Jesús", apellido="Villamizar Ortega",
        cedula="91789012", ciudad="Socorro", telefono="3178901234",
        email="reinaldo.villamizar@gmail.com", tipo=TipoCredito.consumo,
        monto=9_800_000, tasa=18.0, plazo=24, dias_mora=52,
        ratio=0.20, num_creditos=1, score=71.0,
        eventos=[
            (70, "pago", "Último pago registrado antes de entrar en mora."),
            (50, "incumplimiento", "Primera cuota vencida sin pago."),
            (20, "contacto", "Se intentó contactar telefónicamente; no contestó."),
            (5, "incumplimiento", "Mora avanzada de 52 días; caso escalado a cobranza."),
        ],
    ),
    dict(
        bucket="mora_activa", nombre="Gloria Esperanza", apellido="Cala Rangel",
        cedula="63456789", ciudad="Málaga", telefono="3216543210",
        email="gloria.cala@gmail.com", tipo=TipoCredito.microcredito,
        monto=5_500_000, tasa=24.0, plazo=18, dias_mora=95,
        ratio=0.15, num_creditos=1, score=93.5,
        eventos=[
            (110, "incumplimiento", "Dejó de pagar la cuota mensual del microcrédito."),
            (80, "contacto", "Visita domiciliaria sin éxito de contacto."),
            (40, "incumplimiento", "Cartera vencida: 95 días de mora acumulados."),
            (10, "novedad", "Caso remitido a instancia jurídica de la cooperativa."),
        ],
    ),

    # ── PROMESA DE PAGO RECIENTE (1) ────────────────────────────────────────
    dict(
        bucket="promesa", nombre="Édgar Fernando", apellido="Niño Prada",
        cedula="91890123", ciudad="Barbosa", telefono="3189012345",
        email="edgar.nino@gmail.com", tipo=TipoCredito.consumo,
        monto=10_500_000, tasa=18.0, plazo=24, dias_mora=10,
        ratio=0.50, num_creditos=1, score=43.0,
        eventos=[
            (25, "incumplimiento", "Cuota vencida sin pago registrado."),
            (8, "contacto", "Se le contactó por WhatsApp para gestionar el pago pendiente."),
            (2, "promesa_pago", "Prometió pagar el saldo completo antes de fin de mes."),
        ],
        promesa=dict(monto=650_000, dias_futuro=6, nota="Pagará al recibir la quincena."),
    ),
]


def main():
    print("[*] Iniciando seed de datos WafeAI (demo Adriana Archila / Confiar)...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Limpiar datos existentes
        db.query(EventoHistorial).delete()
        db.query(PromesaPago).delete()
        db.query(Pago).delete()
        db.query(Alerta).delete()
        db.query(Credito).delete()
        db.query(Socio).delete()
        db.query(Usuario).delete()
        db.commit()
        print("[+] Base de datos limpiada")

        # ── Usuarios ──
        adriana = Usuario(
            email="adrianaarchilaq@gmail.com",
            nombre="Adriana", apellido="Archila",
            rol=RolUsuario.admin,
            hashed_password=hash_password("WafeAI2026"),
        )
        admin = Usuario(
            email="admin@wafeai.co", nombre="Admin", apellido="WafeAI",
            rol=RolUsuario.admin, hashed_password=hash_password("wafeai2026"),
        )
        analista = Usuario(
            email="analista@wafeai.co", nombre="María", apellido="Analista",
            rol=RolUsuario.analista, hashed_password=hash_password("wafeai2026"),
        )
        db.add_all([adriana, admin, analista])
        db.commit()
        print("[+] Usuarios creados (Adriana Archila = admin principal)")

        resumen = []

        for s in SOCIOS:
            nivel = nivel_desde_score(s["score"])
            estado_mora = estado_mora_desde_dias(s["dias_mora"])

            socio = Socio(
                cedula=s["cedula"], nombre=s["nombre"], apellido=s["apellido"],
                email=s["email"], telefono=s["telefono"], ciudad=s["ciudad"],
                fecha_nacimiento=None,
                fecha_ingreso=dias_atras(365 * 2),
                score_riesgo=s["score"], nivel_riesgo=nivel,
                estado_mora=estado_mora, dias_mora_maximo=s["dias_mora"],
            )
            db.add(socio)
            db.flush()

            # Crédito principal
            cuota = cuota_mensual(s["monto"], s["tasa"], s["plazo"])
            credito_principal = crear_credito(
                db, socio.id, s["tipo"], s["monto"], s["tasa"], s["plazo"],
                s["dias_mora"], es_principal=True,
            )
            crear_pagos(db, socio.id, credito_principal.id, s["ratio"], s["dias_mora"], cuota)

            # Créditos secundarios (perfil de sobreendeudamiento — bucket alto)
            for j in range(1, s["num_creditos"]):
                monto_secundario = round(s["monto"] * (0.4 if j == 1 else 0.25), -3)
                cuota_sec = cuota_mensual(monto_secundario, 18.0, 24)
                cred_sec = crear_credito(
                    db, socio.id, TipoCredito.consumo, monto_secundario,
                    18.0, 24, 0, es_principal=False,
                )
                crear_pagos(db, socio.id, cred_sec.id, 0.6, 0, cuota_sec)

            # Historial de contexto
            crear_eventos(db, socio.id, s["eventos"])

            # Promesa de pago (si aplica)
            if "promesa" in s:
                p = s["promesa"]
                db.add(PromesaPago(
                    socio_id=socio.id, usuario_id=adriana.id,
                    monto_prometido=p["monto"],
                    fecha_prometida=HOY + timedelta(days=p["dias_futuro"]),
                    nota=p["nota"], estado=EstadoPromesa.pendiente,
                ))

            # Alertas — solo para riesgo alto y mora activa (urgente) y medio (media)
            if s["bucket"] in ("alto", "mora_activa"):
                db.add(Alerta(
                    socio_id=socio.id,
                    tipo=TipoAlerta.prediccion_ia if s["bucket"] == "alto" else TipoAlerta.mora_nueva,
                    prioridad=PrioridadAlerta.urgente,
                    mensaje=(f"IA detectó riesgo ALTO para {s['nombre']} {s['apellido']}. "
                             f"Score: {s['score']}%. Días mora: {s['dias_mora']}."),
                ))
            elif s["bucket"] in ("medio", "promesa"):
                db.add(Alerta(
                    socio_id=socio.id,
                    tipo=TipoAlerta.pago_vencido,
                    prioridad=PrioridadAlerta.media,
                    mensaje=(f"Pago vencido detectado para {s['nombre']} {s['apellido']}. "
                             f"{s['dias_mora']} días de mora."),
                ))

            resumen.append({
                "nombre": f"{s['nombre']} {s['apellido']}",
                "cedula": s["cedula"], "ciudad": s["ciudad"],
                "segmento": s["tipo"].value, "monto": s["monto"],
                "cuota": cuota, "dias_mora": s["dias_mora"],
                "score": s["score"], "nivel": nivel.value, "bucket": s["bucket"],
            })

        db.commit()
        print(f"[OK] {len(SOCIOS)} socios creados con créditos, pagos, historial y alertas")
        print()
        print("=" * 70)
        print("CREDENCIALES DE ACCESO:")
        print("  Adriana Archila (gerente): adrianaarchilaq@gmail.com / WafeAI2026")
        print("  Admin backup:              admin@wafeai.co / wafeai2026")
        print("  Analista:                  analista@wafeai.co / wafeai2026")
        print("=" * 70)
        print()
        print(f"{'Socio':<28} {'Cédula':<10} {'Segmento':<12} {'Monto':>12} {'Cuota':>10} {'DíasMora':>8} {'Score':>6} {'Nivel':<7}")
        for r in resumen:
            print(f"{r['nombre']:<28} {r['cedula']:<10} {r['segmento']:<12} "
                  f"{r['monto']:>12,.0f} {r['cuota']:>10,.0f} {r['dias_mora']:>8} "
                  f"{r['score']:>6.1f} {r['nivel']:<7}")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
