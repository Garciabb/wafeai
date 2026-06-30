"""
Script para poblar la base de datos de WafeAI con datos demo realistas.
50 socios colombianos ficticios con historial crediticio de 12 meses.
"""
import sys
import os
import random
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine, Base
from models.user import Usuario, RolUsuario
from models.socio import Socio, NivelRiesgo, EstadoMora
from models.credito import Credito, TipoCredito, EstadoCredito
from models.pago import Pago, EstadoPago
from models.alerta import Alerta, TipoAlerta, PrioridadAlerta
import bcrypt as _bcrypt

def hash_password(pw: str) -> str:
    return _bcrypt.hashpw(pw.encode(), _bcrypt.gensalt()).decode()
random.seed(42)

SOCIOS_DATA = [
    ("Carlos Andrés", "Martínez López", "carlosm", "Bogotá", "3001234567"),
    ("María Fernanda", "García Rodríguez", "mariag", "Medellín", "3012345678"),
    ("Juan Pablo", "Pérez Torres", "juanp", "Cali", "3023456789"),
    ("Claudia Patricia", "Herrera Gómez", "claudiah", "Barranquilla", "3034567890"),
    ("Andrés Felipe", "Ramírez Castro", "andresr", "Bogotá", "3045678901"),
    ("Diana Marcela", "Jiménez Silva", "dianaj", "Medellín", "3056789012"),
    ("Luis Eduardo", "Vargas Mendoza", "luisv", "Cartagena", "3067890123"),
    ("Sandra Milena", "Rojas Pineda", "sandrar", "Cúcuta", "3078901234"),
    ("Jorge Alberto", "Moreno Ríos", "jorgem", "Bucaramanga", "3089012345"),
    ("Alejandra", "Suárez Chávez", "alejandras", "Pereira", "3090123456"),
    ("Ricardo", "López Montoya", "ricardol", "Manizales", "3101234567"),
    ("Liliana", "Guzmán Ortiz", "lilianag", "Ibagué", "3112345678"),
    ("Camilo", "Reyes Cardona", "camilor", "Pasto", "3123456789"),
    ("Adriana", "Muñoz Prada", "adrianam", "Bogotá", "3134567890"),
    ("Sebastián", "Castro Ospina", "sebastianc", "Medellín", "3145678901"),
    ("Natalia", "Patiño Bermúdez", "nataliap", "Cali", "3156789012"),
    ("Gustavo", "Torres Acevedo", "gustavot", "Bogotá", "3167890123"),
    ("Carolina", "Ríos Castaño", "carolinar", "Barranquilla", "3178901234"),
    ("Julián", "Echeverría Salazar", "juliane", "Medellín", "3189012345"),
    ("Paola", "Gómez Aristizabal", "paolago", "Pereira", "3190123456"),
    ("Felipe", "Orozco Mejía", "felipeo", "Bogotá", "3201234567"),
    ("Marcela", "Henao Velásquez", "marcelah", "Medellín", "3212345678"),
    ("Alejandro", "Palacio Jaramillo", "alejandropa", "Cali", "3223456789"),
    ("Viviana", "Bedoya Cano", "vivianab", "Manizales", "3234567890"),
    ("Oscar", "Botero Hoyos", "oscarb", "Bogotá", "3245678901"),
    ("Mónica", "Agudelo Zapata", "monicaa", "Medellín", "3256789012"),
    ("Daniel", "Giraldo Posada", "danielg", "Cartagena", "3267890123"),
    ("Valentina", "Londoño Guerrero", "valentinal", "Cúcuta", "3278901234"),
    ("Mauricio", "Ochoa Toro", "mauricioo", "Bucaramanga", "3289012345"),
    ("Stefanía", "Villa Ángel", "stefaniav", "Bogotá", "3290123456"),
    ("Jhon", "Álvarez Soto", "jhona", "Ibagué", "3301234567"),
    ("Yuliana", "Carvajal Duque", "yulianac", "Pasto", "3312345678"),
    ("Iván", "Quintero Gaviria", "ivanq", "Medellín", "3323456789"),
    ("Paula", "Montoya Escobar", "paulam", "Cali", "3334567890"),
    ("Hernán", "Castaño Ríos", "hernanc", "Bogotá", "3345678901"),
    ("Lina", "Arango Vélez", "linaa", "Medellín", "3356789012"),
    ("Cristian", "Uribe Estrada", "cristianu", "Barranquilla", "3367890123"),
    ("Katherine", "Correa Mena", "katherinec", "Pereira", "3378901234"),
    ("David", "Holguín Taborda", "davidh", "Bogotá", "3389012345"),
    ("Ángela", "Marulanda Correa", "angelam", "Manizales", "3390123456"),
    ("Edwin", "Zuluaga Molina", "edwinz", "Medellín", "3401234567"),
    ("Tatiana", "Ceballos Isaza", "tatianac", "Cartagena", "3412345678"),
    ("Ramiro", "Tobón Gallo", "ramirot", "Cali", "3423456789"),
    ("Lorena", "Vergara Rueda", "lorenavr", "Bogotá", "3434567890"),
    ("Nelson", "Cano Bernal", "nelsonc", "Cúcuta", "3445678901"),
    ("Luisa", "Pineda Trujillo", "luisap", "Bucaramanga", "3456789012"),
    ("Rodrigo", "Salcedo Ramos", "rodrigos", "Bogotá", "3467890123"),
    ("Esperanza", "Zapata Naranjo", "esperanzaz", "Medellín", "3478901234"),
    ("Álvaro", "Murillo Sepúlveda", "alvarom", "Pasto", "3489012345"),
    ("Beatriz", "Calderón Niño", "beatrizc", "Bogotá", "3490123456"),
]

TIPOS_CREDITO = [
    (TipoCredito.microcredito, 2_000_000, 20_000_000, 24, 24.0),
    (TipoCredito.consumo, 5_000_000, 80_000_000, 36, 18.0),
    (TipoCredito.vivienda, 50_000_000, 400_000_000, 180, 12.5),
    (TipoCredito.empresarial, 10_000_000, 150_000_000, 60, 20.0),
]


def generar_cedula(idx: int) -> str:
    return f"{10_000_000 + idx * 173_421}"


def crear_credito_y_pagos(db, socio: Socio, perfil_riesgo: str) -> Credito:
    tipo_info = random.choice(TIPOS_CREDITO)
    tipo, monto_min, monto_max, plazo_base, tasa = tipo_info

    monto = round(random.uniform(monto_min, monto_max), -3)
    plazo = random.choice([plazo_base, plazo_base // 2, plazo_base + 12])
    tasa_mensual = tasa / 12 / 100

    fecha_desembolso = date.today() - relativedelta(months=random.randint(3, 24))
    fecha_vencimiento = fecha_desembolso + relativedelta(months=plazo)

    cuota = monto * (tasa_mensual * (1 + tasa_mensual) ** plazo) / ((1 + tasa_mensual) ** plazo - 1)

    # Calcular cuántas cuotas van hasta hoy
    meses_transcurridos = min(
        relativedelta(date.today(), fecha_desembolso).months +
        relativedelta(date.today(), fecha_desembolso).years * 12,
        plazo,
    )

    if perfil_riesgo == "alto":
        dias_mora = random.randint(45, 180)
        # Máximo 40% pagado para garantizar saldo alto
        num_pagadas = min(max(0, meses_transcurridos - random.randint(2, 5)), int(plazo * 0.4))
        ratio_pago = random.uniform(0.3, 0.6)
    elif perfil_riesgo == "medio":
        dias_mora = random.randint(5, 45)
        # Máximo 65% pagado
        num_pagadas = min(max(0, meses_transcurridos - random.randint(0, 2)), int(plazo * 0.65))
        ratio_pago = random.uniform(0.6, 0.85)
    else:
        dias_mora = random.randint(0, 5)
        # Máximo 80% pagado para mantener saldo visible
        num_pagadas = min(meses_transcurridos, int(plazo * 0.80))
        ratio_pago = random.uniform(0.9, 1.0)

    saldo_pendiente = monto * (1 - (num_pagadas / plazo))

    # Garantizar saldos mínimos realistas según perfil
    saldo_minimo = {
        "alto":  max(1_000_000, monto * 0.55),
        "medio": max(500_000,   monto * 0.35),
        "bajo":  max(200_000,   monto * 0.20),
    }[perfil_riesgo]
    saldo_pendiente = max(saldo_pendiente, saldo_minimo)

    estado_credito = EstadoCredito.activo
    if dias_mora > 90:
        estado_credito = EstadoCredito.vencido

    credito = Credito(
        socio_id=socio.id,
        tipo=tipo,
        monto_original=monto,
        saldo_pendiente=max(saldo_pendiente, 0),
        tasa_interes=tasa,
        plazo_meses=plazo,
        dias_mora=dias_mora,
        fecha_desembolso=fecha_desembolso,
        fecha_vencimiento=fecha_vencimiento,
        estado=estado_credito,
        num_cuotas_total=plazo,
        num_cuotas_pagadas=num_pagadas,
    )
    db.add(credito)
    db.flush()

    # Generar historial de pagos (últimos 12 meses)
    for i in range(min(meses_transcurridos, 12)):
        fecha_venc = fecha_desembolso + relativedelta(months=i + 1)
        pagado_a_tiempo = random.random() < ratio_pago

        if pagado_a_tiempo:
            retraso = random.randint(0, 3)
            fecha_pago = fecha_venc + timedelta(days=retraso)
            estado_pago = EstadoPago.pagado
        elif i < meses_transcurridos - dias_mora // 30:
            retraso = random.randint(5, 20)
            fecha_pago = fecha_venc + timedelta(days=retraso)
            estado_pago = EstadoPago.pagado
        else:
            retraso = dias_mora
            fecha_pago = None
            estado_pago = EstadoPago.vencido

        pago = Pago(
            credito_id=credito.id,
            socio_id=socio.id,
            monto=cuota,
            fecha_pago=fecha_pago,
            fecha_vencimiento_cuota=fecha_venc,
            estado=estado_pago,
            dias_retraso=retraso if fecha_pago else dias_mora,
        )
        db.add(pago)

    return credito


def calcular_score_riesgo(dias_mora: int, ratio_pago: float, deuda_porcentaje: float) -> float:
    score = 0.0
    if dias_mora > 90:
        score += 55
    elif dias_mora > 30:
        score += 35
    elif dias_mora > 0:
        score += 15
    score += (1 - ratio_pago) * 30
    score += deuda_porcentaje * 15
    return min(round(score + random.uniform(-5, 5), 1), 99.0)


def main():
    print("[*] Iniciando seed de datos WafeAI...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Limpiar datos existentes
        db.query(Pago).delete()
        db.query(Alerta).delete()
        db.query(Credito).delete()
        db.query(Socio).delete()
        db.query(Usuario).delete()
        db.commit()
        print("[+] Base de datos limpiada")

        # Crear usuarios del sistema
        admin = Usuario(
            email="admin@wafeai.co",
            nombre="Admin",
            apellido="WafeAI",
            rol=RolUsuario.admin,
            hashed_password=hash_password("wafeai2026"),
        )
        analista = Usuario(
            email="analista@wafeai.co",
            nombre="María",
            apellido="Analista",
            rol=RolUsuario.analista,
            hashed_password=hash_password("wafeai2026"),
        )
        db.add_all([admin, analista])
        db.commit()
        print("[+] Usuarios creados: admin@wafeai.co / analista@wafeai.co (pass: wafeai2026)")

        # Distribución de riesgo: 30% bajo, 40% medio, 30% alto
        perfiles = (
            ["bajo"] * 15 +
            ["medio"] * 20 +
            ["alto"] * 15
        )
        random.shuffle(perfiles)

        alertas_creadas = 0

        for idx, (nombre, apellido, username, ciudad, telefono) in enumerate(SOCIOS_DATA):
            perfil = perfiles[idx]
            cedula = generar_cedula(idx)
            email = f"{username}{random.randint(10,99)}@ejemplo.co"

            # Estado mora según perfil
            if perfil == "alto":
                estado_mora = random.choice([EstadoMora.mora_avanzada, EstadoMora.cartera_vencida])
                dias_mora_max = random.randint(45, 180)
                score = random.uniform(70, 96)
                nivel = NivelRiesgo.alto
            elif perfil == "medio":
                estado_mora = random.choice([EstadoMora.mora_temprana, EstadoMora.al_dia])
                dias_mora_max = random.randint(0, 45)
                score = random.uniform(40, 70)
                nivel = NivelRiesgo.medio
            else:
                estado_mora = EstadoMora.al_dia
                dias_mora_max = random.randint(0, 5)
                score = random.uniform(5, 40)
                nivel = NivelRiesgo.bajo

            socio = Socio(
                cedula=cedula,
                nombre=nombre,
                apellido=apellido,
                email=email,
                telefono=telefono,
                ciudad=ciudad,
                fecha_nacimiento=date(random.randint(1965, 1995), random.randint(1, 12), random.randint(1, 28)),
                fecha_ingreso=date.today() - relativedelta(months=random.randint(6, 60)),
                score_riesgo=round(score, 1),
                nivel_riesgo=nivel,
                estado_mora=estado_mora,
                dias_mora_maximo=dias_mora_max,
            )
            db.add(socio)
            db.flush()

            # Crear 1-2 créditos por socio
            num_creditos = 2 if perfil == "alto" and random.random() > 0.5 else 1
            for _ in range(num_creditos):
                crear_credito_y_pagos(db, socio, perfil)

            # Crear alertas para socios de riesgo alto
            if perfil == "alto":
                tipo_alerta = random.choice([TipoAlerta.riesgo_alto, TipoAlerta.mora_nueva, TipoAlerta.prediccion_ia])
                prioridad = PrioridadAlerta.urgente if dias_mora_max > 60 else PrioridadAlerta.media
                alerta = Alerta(
                    socio_id=socio.id,
                    tipo=tipo_alerta,
                    prioridad=prioridad,
                    mensaje=(f"IA detectó riesgo ALTO para {nombre} {apellido}. "
                             f"Score: {round(score, 1)}%. Días mora: {dias_mora_max}."),
                    leida=random.random() > 0.7,
                )
                db.add(alerta)
                alertas_creadas += 1
            elif perfil == "medio" and random.random() > 0.6:
                alerta = Alerta(
                    socio_id=socio.id,
                    tipo=TipoAlerta.pago_vencido,
                    prioridad=PrioridadAlerta.media,
                    mensaje=f"Pago vencido detectado para {nombre} {apellido}. {dias_mora_max} días de mora.",
                    leida=random.random() > 0.5,
                )
                db.add(alerta)
                alertas_creadas += 1

        db.commit()
        print(f"[OK] 50 socios creados con historial de pagos de 12 meses")
        print(f"[OK] {alertas_creadas} alertas generadas")
        print()
        print("=" * 50)
        print("CREDENCIALES DE ACCESO:")
        print("  Admin:    admin@wafeai.co    / wafeai2026")
        print("  Analista: analista@wafeai.co / wafeai2026")
        print("=" * 50)

    except Exception as e:
        db.rollback()
        print(f"[ERROR] {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
