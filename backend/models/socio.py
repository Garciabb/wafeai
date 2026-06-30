from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Enum as SAEnum, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class NivelRiesgo(str, enum.Enum):
    bajo = "bajo"
    medio = "medio"
    alto = "alto"


class EstadoMora(str, enum.Enum):
    al_dia = "al_dia"
    mora_temprana = "mora_temprana"    # 1-30 días
    mora_avanzada = "mora_avanzada"   # 31-90 días
    cartera_vencida = "cartera_vencida"  # 90+ días


class Socio(Base):
    __tablename__ = "socios"

    id = Column(Integer, primary_key=True, index=True)
    cedula = Column(String(20), unique=True, index=True, nullable=False)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False)
    email = Column(String(150), nullable=False)
    telefono = Column(String(20), nullable=False)
    ciudad = Column(String(80), nullable=False)
    fecha_nacimiento = Column(Date, nullable=True)

    score_riesgo = Column(Float, default=0.0)          # 0-100
    nivel_riesgo = Column(SAEnum(NivelRiesgo), default=NivelRiesgo.bajo)
    estado_mora = Column(SAEnum(EstadoMora), default=EstadoMora.al_dia)
    dias_mora_maximo = Column(Integer, default=0)

    activo = Column(Boolean, default=True)
    fecha_ingreso = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    creditos = relationship("Credito", back_populates="socio", lazy="dynamic")
    pagos = relationship("Pago", back_populates="socio", lazy="dynamic")
    alertas = relationship("Alerta", back_populates="socio", lazy="dynamic")
    comunicaciones = relationship("Comunicacion", back_populates="socio", lazy="dynamic")
