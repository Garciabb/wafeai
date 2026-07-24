from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
import anthropic

from routes.auth import get_usuario_actual
from models.user import Usuario
from config import get_settings

settings = get_settings()

router = APIRouter(prefix="/api", tags=["IA"])

SYSTEM_PROMPT = (
    "Eres WafeAI, asistente de gestión de cartera para cooperativas colombianas. "
    "Con base en el historial de eventos del socio y su perfil de riesgo, "
    "redacta UN mensaje corto (máx 3 líneas) para WhatsApp que sea empático, "
    "profesional y apropiado al momento. No inventes información. "
    "Responde solo con el texto del mensaje, sin explicaciones."
)


class EventoHistorial(BaseModel):
    fecha: str
    tipo: str
    descripcion: str


class PerfilRiesgo(BaseModel):
    score: Optional[float] = None
    dias_mora: Optional[int] = None
    monto: Optional[float] = None


class GenerarMensajeRequest(BaseModel):
    socio_id: int
    historial: list[EventoHistorial] = []
    perfil: PerfilRiesgo = PerfilRiesgo()


def _construir_prompt(data: GenerarMensajeRequest) -> str:
    lineas_historial = "\n".join(
        f"- {e.fecha} · {e.tipo}: {e.descripcion}" for e in data.historial
    ) or "Sin eventos registrados."

    return (
        f"Perfil de riesgo del socio:\n"
        f"- Score de riesgo: {data.perfil.score if data.perfil.score is not None else 'N/A'}\n"
        f"- Días en mora: {data.perfil.dias_mora if data.perfil.dias_mora is not None else 'N/A'}\n"
        f"- Monto: {data.perfil.monto if data.perfil.monto is not None else 'N/A'}\n\n"
        f"Historial de eventos:\n{lineas_historial}\n\n"
        f"Redacta el mensaje de WhatsApp para este socio."
    )


@router.post("/generar-mensaje", summary="Generar mensaje sugerido con IA (contexto del socio)")
def generar_mensaje(
    data: GenerarMensajeRequest,
    usuario: Usuario = Depends(get_usuario_actual),
):
    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY no está configurada")

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    try:
        respuesta = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=300,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": _construir_prompt(data)}],
        )
        mensaje = "".join(
            block.text for block in respuesta.content if block.type == "text"
        ).strip()
    except anthropic.APIError as e:
        raise HTTPException(status_code=502, detail=f"Error al generar mensaje con IA: {e}")

    return {"mensaje": mensaje}
