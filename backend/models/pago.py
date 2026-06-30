from sqlalchemy import Column, Integer, Float, DateTime, Date, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class EstadoPago(str, enum.Enum):
    pagado = "pagado"
    pendiente = "pendiente"
    vencido = "vencido"


class Pago(Base):
    __tablename__ = "pagos"

    id = Column(Integer, primary_key=True, index=True)
    credito_id = Column(Integer, ForeignKey("creditos.id"), nullable=False)
    socio_id = Column(Integer, ForeignKey("socios.id"), nullable=False)

    monto = Column(Float, nullable=False)                     # COP
    fecha_pago = Column(Date, nullable=True)                  # Fecha real del pago
    fecha_vencimiento_cuota = Column(Date, nullable=False)    # Fecha esperada
    estado = Column(SAEnum(EstadoPago), default=EstadoPago.pendiente)
    dias_retraso = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    credito = relationship("Credito", back_populates="pagos")
    socio = relationship("Socio", back_populates="pagos")
