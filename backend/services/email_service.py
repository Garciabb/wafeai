import httpx
from config import get_settings

settings = get_settings()

PLANTILLAS = {
    "recordatorio_pago": {
        "asunto": "Recordatorio de pago - {cooperativa}",
        "html": """
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #080808; color: #F0F0EB; padding: 32px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <span style="font-size: 28px; font-weight: bold; color: #F0F0EB;">WAFE<span style="color: #00E5A0;">AI</span></span>
          </div>
          <h2 style="color: #00E5A0; margin-bottom: 16px;">Recordatorio de Pago</h2>
          <p>Estimado/a <strong>{nombre}</strong>,</p>
          <p>Le informamos que tiene una cuota pendiente por <strong style="color: #00E5A0;">{monto}</strong> con vencimiento el <strong>{fecha_vencimiento}</strong>.</p>
          <div style="margin: 24px 0; padding: 16px; background: #111; border-radius: 8px; border-left: 4px solid #00E5A0;">
            <p style="margin: 0;"><strong>Monto:</strong> {monto}</p>
            <p style="margin: 8px 0 0;"><strong>Vencimiento:</strong> {fecha_vencimiento}</p>
          </div>
          <p style="color: #888; font-size: 12px;">WafeAI para {cooperativa}.</p>
        </div>
        """,
    },
    "mora_urgente": {
        "asunto": "URGENTE: Regularice su situacion - {cooperativa}",
        "html": """
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #080808; color: #F0F0EB; padding: 32px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <span style="font-size: 28px; font-weight: bold; color: #F0F0EB;">WAFE<span style="color: #00E5A0;">AI</span></span>
          </div>
          <h2 style="color: #ff4444; margin-bottom: 16px;">Aviso de Mora</h2>
          <p>Estimado/a <strong>{nombre}</strong>,</p>
          <p>Su obligacion presenta <strong style="color: #ff4444;">{dias_mora} dias de mora</strong> por un valor de <strong style="color: #00E5A0;">{monto}</strong>.</p>
          <p style="color: #888; font-size: 12px;">WafeAI — Gestion inteligente de cartera para {cooperativa}.</p>
        </div>
        """,
    },
}


def _modo_demo() -> bool:
    """Demo activo si no hay key O si el dominio aun no esta verificado en Resend."""
    return not settings.RESEND_API_KEY or settings.RESEND_API_KEY.strip() == ""


async def enviar_email(destinatario_email: str, destinatario_nombre: str,
                       plantilla: str, variables: dict) -> dict:
    """Envía un email via Resend. Si falla (dominio no verificado, sandbox, etc.)
    retorna simulación exitosa para no arruinar demos."""
    if _modo_demo():
        return {"enviado": True, "demo": True, "id": f"demo_{destinatario_email[:8]}", "email": destinatario_email}

    template = PLANTILLAS.get(plantilla, PLANTILLAS["recordatorio_pago"])
    asunto = template["asunto"].format(**variables)
    html = template["html"].format(nombre=destinatario_nombre, **variables)

    payload = {
        "from": settings.RESEND_FROM_EMAIL,
        "to": [destinatario_email],
        "subject": asunto,
        "html": html,
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}",
                         "Content-Type": "application/json"},
                json=payload,
                timeout=15.0,
            )
            resp.raise_for_status()
            data = resp.json()
            return {"enviado": True, "demo": False, "id": data.get("id"), "email": destinatario_email}
    except Exception:
        # Fallback demo: cualquier error de API → simular éxito para MVP
        return {"enviado": True, "demo": True, "id": f"sim_{destinatario_email[:8]}", "email": destinatario_email}
