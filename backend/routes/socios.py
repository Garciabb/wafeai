import csv
import io
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional
from datetime import date, timedelta
from database import get_db
from models.socio import Socio, NivelRiesgo, EstadoMora
from models.credito import Credito, EstadoCredito, TipoCredito
from services.scoring import calcular_y_guardar_score
from routes.auth import get_usuario_actual
from models.user import Usuario

router = APIRouter(prefix="/api/socios", tags=["Socios"])


class SocioCreate(BaseModel):
    cedula: str
    nombre: str
    apellido: str
    email: EmailStr
    telefono: str
    ciudad: str
    fecha_nacimiento: Optional[date] = None
    fecha_ingreso: Optional[date] = None
    monto: Optional[float] = None
    tipo_credito: Optional[str] = None
    dias_mora: Optional[int] = 0


class SocioUpdate(BaseModel):
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    email: Optional[EmailStr] = None
    telefono: Optional[str] = None
    ciudad: Optional[str] = None


def _socio_dict(s: Socio, db: Session) -> dict:
    credito = s.creditos.filter(Credito.estado == EstadoCredito.activo).order_by(Credito.saldo_pendiente.desc()).first()
    return {
        "id": s.id,
        "cedula": s.cedula,
        "nombre": s.nombre,
        "apellido": s.apellido,
        "nombre_completo": f"{s.nombre} {s.apellido}",
        "email": s.email,
        "telefono": s.telefono,
        "ciudad": s.ciudad,
        "fecha_nacimiento": s.fecha_nacimiento.isoformat() if s.fecha_nacimiento else None,
        "fecha_ingreso": s.fecha_ingreso.isoformat() if s.fecha_ingreso else None,
        "score_riesgo": s.score_riesgo,
        "nivel_riesgo": s.nivel_riesgo,
        "estado_mora": s.estado_mora,
        "dias_mora": s.dias_mora_maximo,
        "saldo_pendiente": credito.saldo_pendiente if credito else 0,
        "tipo_credito": credito.tipo if credito else None,
        "activo": s.activo,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


@router.get("/", summary="Listar socios con filtros")
def listar_socios(
    busqueda: Optional[str] = Query(None),
    nivel_riesgo: Optional[NivelRiesgo] = None,
    estado_mora: Optional[EstadoMora] = None,
    ciudad: Optional[str] = None,
    pagina: int = Query(1, ge=1),
    por_pagina: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    query = db.query(Socio).filter(Socio.activo == True)

    if busqueda:
        like = f"%{busqueda}%"
        query = query.filter(or_(
            Socio.nombre.ilike(like),
            Socio.apellido.ilike(like),
            Socio.cedula.ilike(like),
            Socio.email.ilike(like),
        ))
    if nivel_riesgo:
        query = query.filter(Socio.nivel_riesgo == nivel_riesgo)
    if estado_mora:
        query = query.filter(Socio.estado_mora == estado_mora)
    if ciudad:
        query = query.filter(Socio.ciudad.ilike(f"%{ciudad}%"))

    total = query.count()
    socios = query.order_by(Socio.score_riesgo.desc()).offset(
        (pagina - 1) * por_pagina
    ).limit(por_pagina).all()

    return {
        "total": total,
        "pagina": pagina,
        "por_pagina": por_pagina,
        "paginas": (total + por_pagina - 1) // por_pagina,
        "socios": [_socio_dict(s, db) for s in socios],
    }


@router.get("/{socio_id}", summary="Detalle completo de un socio")
def get_socio(
    socio_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    socio = db.query(Socio).filter(Socio.id == socio_id, Socio.activo == True).first()
    if not socio:
        raise HTTPException(status_code=404, detail="Socio no encontrado")

    creditos = socio.creditos.all()
    pagos_recientes = socio.pagos.order_by(
        Credito.created_at.desc() if False else None  # type: ignore
    ).limit(12).all()

    return {
        **_socio_dict(socio, db),
        "creditos": [
            {
                "id": c.id,
                "tipo": c.tipo,
                "monto_original": c.monto_original,
                "saldo_pendiente": c.saldo_pendiente,
                "tasa_interes": c.tasa_interes,
                "plazo_meses": c.plazo_meses,
                "dias_mora": c.dias_mora,
                "fecha_desembolso": c.fecha_desembolso.isoformat(),
                "fecha_vencimiento": c.fecha_vencimiento.isoformat(),
                "estado": c.estado,
                "num_cuotas_pagadas": c.num_cuotas_pagadas,
                "num_cuotas_total": c.num_cuotas_total,
            }
            for c in creditos
        ],
        "comunicaciones_recientes": [
            {
                "id": com.id,
                "tipo": com.tipo,
                "asunto": com.asunto,
                "estado": com.estado,
                "fecha": com.created_at.isoformat() if com.created_at else None,
            }
            for com in socio.comunicaciones.order_by(None).limit(10).all()
        ],
    }


@router.post("/", summary="Crear nuevo socio")
def crear_socio(
    data: SocioCreate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    existente = db.query(Socio).filter(Socio.cedula == data.cedula).first()
    if existente:
        raise HTTPException(status_code=400, detail="Ya existe un socio con esa cédula")

    socio = Socio(**data.model_dump(exclude={'monto', 'tipo_credito', 'dias_mora'}))
    socio.dias_mora_maximo = data.dias_mora or 0
    db.add(socio)
    db.commit()
    db.refresh(socio)

    if data.monto is not None:
        hoy = date.today()
        vencimiento = hoy + timedelta(days=365)
        tipo_val = data.tipo_credito or 'consumo'
        try:
            tipo_enum = TipoCredito(tipo_val)
        except ValueError:
            tipo_enum = TipoCredito.consumo
        credito = Credito(
            socio_id=socio.id,
            tipo=tipo_enum,
            monto_original=data.monto,
            saldo_pendiente=data.monto,
            tasa_interes=0.0,
            plazo_meses=12,
            dias_mora=data.dias_mora or 0,
            fecha_desembolso=hoy,
            fecha_vencimiento=vencimiento,
            estado=EstadoCredito.activo,
            num_cuotas_total=12,
        )
        db.add(credito)
        db.commit()

    # Calcular score de riesgo IA real en vez de dejar el default 0.0/bajo
    calcular_y_guardar_score(socio, db)
    db.commit()

    return {"mensaje": "Socio creado exitosamente", "id": socio.id}


@router.patch("/{socio_id}", summary="Actualizar datos de un socio")
def actualizar_socio(
    socio_id: int,
    data: SocioUpdate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    socio = db.query(Socio).filter(Socio.id == socio_id).first()
    if not socio:
        raise HTTPException(status_code=404, detail="Socio no encontrado")

    if data.email:
        duplicado = db.query(Socio).filter(Socio.email == data.email, Socio.id != socio_id).first()
        if duplicado:
            raise HTTPException(status_code=400, detail="El email ya está en uso por otro socio")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(socio, field, value)

    db.commit()
    db.refresh(socio)
    return _socio_dict(socio, db)


@router.delete("/{socio_id}", summary="Desactivar un socio (soft delete)")
def eliminar_socio(
    socio_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    socio = db.query(Socio).filter(Socio.id == socio_id).first()
    if not socio:
        raise HTTPException(status_code=404, detail="Socio no encontrado")
    socio.activo = False
    db.commit()
    return {"mensaje": "Socio desactivado exitosamente"}


MAX_CSV_BYTES = 5 * 1024 * 1024  # 5 MB


@router.post("/importar-csv", summary="Importar socios desde archivo CSV")
async def importar_csv(
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    """Importa socios desde CSV. Columnas: cedula,nombre,apellido,email,telefono,ciudad"""
    # Validar tipo MIME
    if archivo.content_type not in ("text/csv", "text/plain", "application/vnd.ms-excel"):
        raise HTTPException(status_code=415, detail="Solo se aceptan archivos CSV")

    # Limitar tamaño a 5 MB — previene DoS
    contenido = await archivo.read(MAX_CSV_BYTES + 1)
    if len(contenido) > MAX_CSV_BYTES:
        raise HTTPException(status_code=413, detail="El archivo CSV no puede superar 5 MB")

    texto = contenido.decode("utf-8-sig")
    lector = csv.DictReader(io.StringIO(texto))

    creados, omitidos, errores = 0, 0, []

    # Pre-fetch all existing cedulas to avoid per-row queries (EC-06)
    cedulas_existentes = set(row[0] for row in db.query(Socio.cedula).all())

    for i, fila in enumerate(lector, 1):
        cedula = fila.get("cedula", "").strip()
        if not cedula:
            errores.append(f"Fila {i}: cédula vacía")
            continue

        if cedula in cedulas_existentes:
            omitidos += 1
            continue

        nuevo_socio = Socio(
            cedula=cedula,
            nombre=fila.get("nombre", "").strip(),
            apellido=fila.get("apellido", "").strip(),
            email=fila.get("email", "").strip(),
            telefono=fila.get("telefono", "").strip(),
            ciudad=fila.get("ciudad", "Bogotá").strip(),
        )
        try:
            db.add(nuevo_socio)
            db.flush()
            cedulas_existentes.add(cedula)
            creados += 1
        except Exception as e:
            db.rollback()
            errores.append(f"Fila {i}: {str(e)}")

    db.commit()
    return {"creados": creados, "omitidos": omitidos, "errores": errores}
