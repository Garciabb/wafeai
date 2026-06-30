from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Date, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class TipoCredito(str, enum.Enum):
    microcredito = "microcredito"
    consumo = "consumo"
    vivienda = "vivienda"
    empresarial = "empresarial"


class EstadoCredito(str, enum.Enum):
    activo = "activo"
    pagado = "pagado"
    vencido = "vencido"
    castigado = "castigado"


class Credito(Base):
    __tablename__ = "creditos"

    id = Column(Integer, primary_key=True, index=True)
    socio_id = Column(Integer, ForeignKey("socios.id"), nullable=False)

    tipo = Column(SAEnum(TipoCredito), nullable=False)
    monto_original = Column(Float, nullable=False)       # COP
    saldo_pendiente = Column(Float, nullable=False)      # COP
    tasa_interes = Column(Float, nullable=False)         # % anual
    plazo_meses = Column(Integer, nullable=False)
    dias_mora = Column(Integer, default=0)
    fecha_desembolso = Column(Date, nullable=False)
    fecha_vencimiento = Column(Date, nullable=False)
    estado = Column(SAEnum(EstadoCredito), default=EstadoCredito.activo)

    num_cuotas_total = Column(Integer, nullable=False)
    num_cuotas_pagadas = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    socio = relationship("Socio", back_populates="creditos")
    pagos = relationship("Pago", back_populates="credito", lazy="dynamic")
