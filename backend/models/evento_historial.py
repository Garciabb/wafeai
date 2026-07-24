from sqlalchemy import Column, Integer, String, Date, ForeignKey, DateTime
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class TipoEvento(str, enum.Enum):
    pago = "pago"
    incumplimiento = "incumplimiento"
    promesa_pago = "promesa_pago"
    contacto = "contacto"
    novedad = "novedad"


class EventoHistorial(Base):
    __tablename__ = "eventos_historial"

    id = Column(Integer, primary_key=True, index=True)
    socio_id = Column(Integer, ForeignKey("socios.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)

    tipo = Column(SAEnum(TipoEvento), nullable=False)
    descripcion = Column(String(500), nullable=False)
    fecha = Column(Date, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    socio = relationship("Socio", back_populates="eventos_historial")
    usuario = relationship("Usuario")
