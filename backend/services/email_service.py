import httpx
from config import get_settings

settings = get_settings()

PLANTILLAS = {
    "recordatorio_pago": {
        "asunto": "Recordatorio de pago — {cooperativa}",
        "html": """
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
  <div style="background: #070707; padding: 24px; text-align: center;">
    <h1 style="color: #00E5A0; margin: 0; font-size: 24px;">WafeAI</h1>
    <p style="color: #888; margin: 4px 0 0; font-size: 13px;">Gestión Inteligente de Cartera</p>
  </div>
  <div style="padding: 32px 24px;">
    <p style="color: #333; font-size: 15px;">Estimado/a <strong>{nombre}</strong>,</p>
    <p style="color: #555; font-size: 14px; line-height: 1.6;">
      Le recordamos que tiene una obligación pendiente con <strong>{cooperativa}</strong>
      por un valor de <strong style="color: #00A67E;">{monto}</strong>.
    </p>
    <p style="color: #555; font-size: 14px; line-height: 1.6;">
      Por favor realice su pago antes del <strong>{fecha_vencimiento}</strong>
      para evitar cargos adicionales.
    </p>
    <div style="background: #f8f8f8; border-left: 4px solid #00E5A0; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="margin: 0; color: #333; font-size: 13px;"><strong>Días en mora:</strong> {dias_mora}</p>
      <p style="margin: 8px 0 0; color: #333; font-size: 13px;"><strong>Saldo pendiente:</strong> {monto}</p>
    </div>
    <p style="color: #555; font-size: 14px;">
      Si ya realizó su pago, por favor ignore este mensaje.
    </p>
  </div>
  <div style="background: #070707; padding: 16px; text-align: center;">
    <p style="color: #555; margin: 0; font-size: 12px;">WafeAI — Plataforma de Gestión de Cartera</p>
  </div>
</div>
""",
    },
    "mora_urgente": {
        "asunto": "URGENTE: Su crédito requiere atención inmediata — {cooperativa}",
        "html": """
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
  <div style="background: #070707; padding: 24px; text-align: center;">
    <h1 style="color: #00E5A0; margin: 0; font-size: 24px;">WafeAI</h1>
  </div>
  <div style="background: #FFF5F5; border-top: 4px solid #FF4455; padding: 16px 24px;">
    <p style="color: #CC0000; margin: 0; font-weight: bold; font-size: 14px;">Aviso urgente de cobranza</p>
  </div>
  <div style="padding: 32px 24px;">
    <p style="color: #333; font-size: 15px;">Estimado/a <strong>{nombre}</strong>,</p>
    <p style="color: #555; font-size: 14px; line-height: 1.6;">
      Su obligación crediticia presenta <strong style="color: #CC0000;">{dias_mora} días de mora</strong>
      con un saldo pendiente de <strong style="color: #CC0000;">{monto}</strong>.
    </p>
    <p style="color: #555; font-size: 14px; line-height: 1.6;">
      Tenemos opciones de refinanciamiento disponibles para usted.
    </p>
  </div>
  <div style="background: #070707; padding: 16px; text-align: center;">
    <p style="color: #555; margin: 0; font-size: 12px;">WafeAI — Plataforma de Gestión de Cartera</p>
  </div>
</div>
""",
    },
}


async def enviar_email(
    destinatario_email: str,
    destinatario_nombre: str,
    plantilla: str = "recordatorio_pago",
    variables: dict = {},
) -> dict:
    if not settings.RESEND_API_KEY or not settings.RESEND_API_KEY.strip():
        # Modo demo: simula envío exitoso sin API key real
        return {
            "enviado": True,
            "demo": True,
            "id": f"demo_{destinatario_email}",
            "detalle": "Modo demo — agrega RESEND_API_KEY en .env para envíos reales.",
        }

    tpl = PLANTILLAS.get(plantilla, PLANTILLAS["recordatorio_pago"])

    vars_completas = {
        "nombre": destinatario_nombre,
        "cooperativa": "Cooperativa Financiera",
        "monto": "N/A",
        "fecha_vencimiento": "N/A",
        "dias_mora": "0",
        **variables,
    }

    asunto = tpl["asunto"].format(**vars_completas)
    html = tpl["html"].format(**vars_completas)

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": settings.RESEND_FROM_EMAIL,
                    "to": [destinatario_email],
                    "subject": asunto,
                    "html": html,
                },
            )
        if resp.status_code in (200, 201):
            return {"enviado": True, "id": resp.json().get("id"), "demo": False}
        else:
            return {
                "enviado": False,
                "error": resp.json() if resp.headers.get("content-type", "").startswith("application/json") else resp.text,
                "status": resp.status_code,
                "demo": False,
            }
    except Exception as e:
        return {"enviado": False, "error": str(e), "demo": False}
