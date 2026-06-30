from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SAEnum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class TipoComunicacion(str, enum.Enum):
    email = "email"
    whatsapp = "whatsapp"
    llamada = "llamada"


class EstadoComunicacion(str, enum.Enum):
    enviado = "enviado"
    pendiente = "pendiente"
    fallido = "fallido"


class Comunicacion(Base):
    __tablename__ = "comunicaciones"

    id = Column(Integer, primary_key=True, index=True)
    socio_id = Column(Integer, ForeignKey("socios.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)

    tipo = Column(SAEnum(TipoComunicacion), nullable=False)
    asunto = Column(String(200), nullable=True)
    mensaje = Column(Text, nullable=False)
    estado = Column(SAEnum(EstadoComunicacion), default=EstadoComunicacion.pendiente)
    plantilla = Column(String(100), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    socio = relationship("Socio", back_populates="comunicaciones")
