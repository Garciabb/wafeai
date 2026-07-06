from sqlalchemy import Column, Integer, Float, Date, String, ForeignKey, DateTime
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class EstadoPromesa(str, enum.Enum):
    pendiente = "pendiente"
    cumplida = "cumplida"
    incumplida = "incumplida"


class PromesaPago(Base):
    __tablename__ = "promesas_pago"

    id = Column(Integer, primary_key=True, index=True)
    socio_id = Column(Integer, ForeignKey("socios.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    monto_prometido = Column(Float, nullable=False)
    fecha_prometida = Column(Date, nullable=False)
    nota = Column(String(500), nullable=True)
    estado = Column(SAEnum(EstadoPromesa), default=EstadoPromesa.pendiente, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    socio = relationship("Socio", back_populates="promesas_pago")
    usuario = relationship("Usuario")
