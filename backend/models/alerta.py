from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class TipoAlerta(str, enum.Enum):
    riesgo_alto = "riesgo_alto"
    mora_nueva = "mora_nueva"
    pago_vencido = "pago_vencido"
    prediccion_ia = "prediccion_ia"
    recupero = "recupero"


class PrioridadAlerta(str, enum.Enum):
    urgente = "urgente"
    media = "media"
    baja = "baja"


class Alerta(Base):
    __tablename__ = "alertas"

    id = Column(Integer, primary_key=True, index=True)
    socio_id = Column(Integer, ForeignKey("socios.id"), nullable=False)

    tipo = Column(SAEnum(TipoAlerta), nullable=False)
    prioridad = Column(SAEnum(PrioridadAlerta), default=PrioridadAlerta.media)
    mensaje = Column(String(500), nullable=False)
    leida = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    socio = relationship("Socio", back_populates="alertas")
