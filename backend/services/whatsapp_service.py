import httpx
from config import get_settings

settings = get_settings()


def _modo_demo() -> bool:
    """Retorna True si no hay token de WhatsApp configurado."""
    return not settings.WHATSAPP_TOKEN or settings.WHATSAPP_TOKEN.strip() == ""


def _url() -> str:
    return (f"https://graph.facebook.com/{settings.WHATSAPP_API_VERSION}"
            f"/{settings.WHATSAPP_PHONE_ID}/messages")


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {settings.WHATSAPP_TOKEN}",
        "Content-Type": "application/json",
    }


async def enviar_whatsapp_texto(telefono: str, mensaje: str) -> dict:
    """Envía mensaje de texto por WhatsApp. En modo demo, simula el envío."""
    numero = telefono.replace("+", "").replace(" ", "").replace("-", "")
    if numero.startswith("3") and len(numero) == 10:
        numero = "57" + numero

    if _modo_demo():
        return {
            "enviado": True,
            "demo": True,
            "message_id": f"demo_wa_{numero[-4:]}",
            "numero": numero,
        }

    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": numero,
        "type": "text",
        "text": {"preview_url": False, "body": mensaje},
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                _url(), headers=_headers(), json=payload, timeout=15.0
            )
            resp.raise_for_status()
            data = resp.json()
            return {
                "enviado": True,
                "demo": False,
                "message_id": data.get("messages", [{}])[0].get("id"),
                "numero": numero,
            }
    except httpx.HTTPStatusError as e:
        return {"enviado": False, "demo": False, "error": str(e), "detalle": e.response.text}
    except Exception as e:
        return {"enviado": False, "demo": False, "error": str(e)}


async def enviar_whatsapp_plantilla(telefono: str, nombre_plantilla: str,
                                    parametros: list[str]) -> dict:
    numero = telefono.replace("+", "").replace(" ", "").replace("-", "")
    if numero.startswith("3") and len(numero) == 10:
        numero = "57" + numero

    if _modo_demo():
        return {"enviado": True, "demo": True, "message_id": f"demo_{numero[-4:]}"}

    componentes = []
    if parametros:
        componentes.append({
            "type": "body",
            "parameters": [{"type": "text", "text": p} for p in parametros],
        })

    payload = {
        "messaging_product": "whatsapp",
        "to": numero,
        "type": "template",
        "template": {
            "name": nombre_plantilla,
            "language": {"code": "es_CO"},
            "components": componentes,
        },
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                _url(), headers=_headers(), json=payload, timeout=15.0
            )
            resp.raise_for_status()
            data = resp.json()
            return {"enviado": True, "demo": False, "message_id": data.get("messages", [{}])[0].get("id")}
    except httpx.HTTPStatusError as e:
        return {"enviado": False, "demo": False, "error": str(e), "detalle": e.response.text}
    except Exception as e:
        return {"enviado": False, "demo": False, "error": str(e)}


def generar_mensaje_cobranza(nombre: str, monto: str, dias_mora: int = 0) -> str:
    if dias_mora > 30:
        return (f"Hola {nombre}, le informamos que su obligacion presenta "
                f"{dias_mora} dias de mora por un valor de {monto}. "
                f"Por favor regularice su situacion. WafeAI.")
    return (f"Hola {nombre}, le recordamos que tiene un pago proximo a vencer "
            f"por {monto}. Gracias por su puntualidad. WafeAI.")
