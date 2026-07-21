import httpx
from config import get_settings

settings = get_settings()

PLANTILLAS = {
    "recordatorio_pago": {
        "asunto": "Recordatorio de pago — {cooperativa}",
        "html": """
<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:#F4F5F7;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F5F7;padding:32px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

      <!-- HEADER -->
      <tr>
        <td style="background:#0A0A0A;padding:28px 40px;text-align:center;">
          <p style="margin:0;font-size:26px;font-weight:900;letter-spacing:-0.5px;color:#ffffff;">
            WAFE<span style="color:#00E5A0;">AI</span>
          </p>
          <p style="margin:6px 0 0;font-size:12px;color:#555;letter-spacing:0.08em;text-transform:uppercase;">
            Gestión Inteligente de Cartera
          </p>
        </td>
      </tr>

      <!-- BANNER VERDE -->
      <tr>
        <td style="background:#00E5A0;padding:12px 40px;">
          <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#0A0A0A;">
            Recordatorio de pago
          </p>
        </td>
      </tr>

      <!-- SALUDO -->
      <tr>
        <td style="padding:36px 40px 0;">
          <p style="margin:0;font-size:20px;font-weight:700;color:#111111;">
            Hola, <span style="color:#00A67E;">{nombre}</span>
          </p>
          <p style="margin:12px 0 0;font-size:15px;color:#555555;line-height:1.7;">
            Te escribimos de parte de <strong>{cooperativa}</strong> para recordarte que tienes
            una cuota pendiente. Regularizar tu situación evita cargos adicionales y protege
            tu historial crediticio.
          </p>
        </td>
      </tr>

      <!-- TARJETA DE DEUDA -->
      <tr>
        <td style="padding:28px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F9FA;border-radius:10px;overflow:hidden;border:1px solid #E8E8E8;">
            <tr>
              <td style="padding:20px 24px;border-bottom:1px solid #E8E8E8;">
                <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#999;">Saldo pendiente</p>
                <p style="margin:6px 0 0;font-size:30px;font-weight:900;color:#111;">{monto}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="50%" style="padding:16px 24px;border-right:1px solid #E8E8E8;">
                      <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#999;">Días en mora</p>
                      <p style="margin:4px 0 0;font-size:18px;font-weight:800;color:{dias_mora_color};">{dias_mora} días</p>
                    </td>
                    <td width="50%" style="padding:16px 24px;">
                      <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#999;">Fecha límite</p>
                      <p style="margin:4px 0 0;font-size:18px;font-weight:800;color:#111;">{fecha_vencimiento}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- MENSAJE -->
      <tr>
        <td style="padding:0 40px 28px;">
          <p style="margin:0;font-size:14px;color:#777;line-height:1.7;">
            Si ya realizaste tu pago, ignora este mensaje. Si tienes alguna duda o necesitas
            hablar con un asesor, responde este correo o contáctanos directamente.
          </p>
        </td>
      </tr>

      <!-- DIVIDER -->
      <tr><td style="padding:0 40px;"><div style="height:1px;background:#EEEEEE;"></div></td></tr>

      <!-- FOOTER -->
      <tr>
        <td style="padding:24px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#BBBBBB;">
            Este mensaje fue enviado por <strong style="color:#999;">{cooperativa}</strong>
            a través de <strong style="color:#999;">WafeAI</strong>.
          </p>
          <p style="margin:6px 0 0;font-size:11px;color:#CCCCCC;">
            Si crees que recibiste este correo por error, ignóralo.
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>
""",
    },
    "mora_urgente": {
        "asunto": "Aviso importante sobre tu crédito — {cooperativa}",
        "html": """
<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:#F4F5F7;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F5F7;padding:32px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

      <!-- HEADER -->
      <tr>
        <td style="background:#0A0A0A;padding:28px 40px;text-align:center;">
          <p style="margin:0;font-size:26px;font-weight:900;letter-spacing:-0.5px;color:#ffffff;">
            WAFE<span style="color:#00E5A0;">AI</span>
          </p>
          <p style="margin:6px 0 0;font-size:12px;color:#555;letter-spacing:0.08em;text-transform:uppercase;">
            Gestión Inteligente de Cartera
          </p>
        </td>
      </tr>

      <!-- BANNER ROJO -->
      <tr>
        <td style="background:#FF4455;padding:12px 40px;">
          <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#ffffff;">
            Aviso urgente — Acción requerida
          </p>
        </td>
      </tr>

      <!-- SALUDO -->
      <tr>
        <td style="padding:36px 40px 0;">
          <p style="margin:0;font-size:20px;font-weight:700;color:#111111;">
            Hola, <span style="color:#CC0000;">{nombre}</span>
          </p>
          <p style="margin:12px 0 0;font-size:15px;color:#555555;line-height:1.7;">
            Tu crédito con <strong>{cooperativa}</strong> presenta una mora que requiere
            atención inmediata. Es importante que te pongas al día para evitar consecuencias
            adicionales sobre tu historial crediticio.
          </p>
        </td>
      </tr>

      <!-- TARJETA DE DEUDA -->
      <tr>
        <td style="padding:28px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFF5F5;border-radius:10px;overflow:hidden;border:1px solid #FFCCCC;">
            <tr>
              <td style="padding:20px 24px;border-bottom:1px solid #FFCCCC;">
                <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#CC8888;">Saldo pendiente</p>
                <p style="margin:6px 0 0;font-size:30px;font-weight:900;color:#CC0000;">{monto}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="50%" style="padding:16px 24px;border-right:1px solid #FFCCCC;">
                      <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#CC8888;">Días en mora</p>
                      <p style="margin:4px 0 0;font-size:18px;font-weight:800;color:#CC0000;">{dias_mora} días</p>
                    </td>
                    <td width="50%" style="padding:16px 24px;">
                      <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#CC8888;">Fecha límite</p>
                      <p style="margin:4px 0 0;font-size:18px;font-weight:800;color:#111;">{fecha_vencimiento}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- MENSAJE -->
      <tr>
        <td style="padding:0 40px 28px;">
          <p style="margin:0;font-size:14px;color:#777;line-height:1.7;">
            Si ya realizaste tu pago, ignora este mensaje. De lo contrario, te recomendamos
            contactarnos a la brevedad — tenemos opciones de acuerdo de pago disponibles
            para regularizar tu situación.
          </p>
        </td>
      </tr>

      <!-- DIVIDER -->
      <tr><td style="padding:0 40px;"><div style="height:1px;background:#EEEEEE;"></div></td></tr>

      <!-- FOOTER -->
      <tr>
        <td style="padding:24px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#BBBBBB;">
            Este mensaje fue enviado por <strong style="color:#999;">{cooperativa}</strong>
            a través de <strong style="color:#999;">WafeAI</strong>.
          </p>
          <p style="margin:6px 0 0;font-size:11px;color:#CCCCCC;">
            Si crees que recibiste este correo por error, ignóralo.
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>
""",
    },
}


async def enviar_email(
    destinatario_email: str,
    destinatario_nombre: str,
    plantilla: str = "recordatorio_pago",
    variables: dict = {},
    asunto_custom: str = None,
    cuerpo_html_custom: str = None,
    cc: list = [],
) -> dict:
    if not settings.RESEND_API_KEY or not settings.RESEND_API_KEY.strip():
        return {
            "enviado": True,
            "demo": True,
            "id": f"demo_{destinatario_email}",
            "detalle": "Modo demo — agrega RESEND_API_KEY en .env para envíos reales.",
        }

    if asunto_custom or cuerpo_html_custom:
        asunto = asunto_custom or ""
        html = cuerpo_html_custom or ""
    else:
        tpl = PLANTILLAS.get(plantilla, PLANTILLAS["recordatorio_pago"])
        vars_completas = {
            "nombre": destinatario_nombre,
            "cooperativa": "Cooperativa Financiera",
            "monto": "N/A",
            "fecha_vencimiento": "N/A",
            "dias_mora": "0",
            "dias_mora_color": "#00A67E",
            **variables,
        }
        asunto = tpl["asunto"].format(**vars_completas)
        html = tpl["html"].format(**vars_completas)

    payload = {
        "from": settings.RESEND_FROM_EMAIL,
        "to": [destinatario_email],
        "subject": asunto,
        "html": html,
    }
    if cc:
        payload["cc"] = cc

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
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
