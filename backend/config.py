from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./wafeai.db"
    SECRET_KEY: str = "wafeai_secret_key_dev_CHANGE_IN_PRODUCTION"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120   # 2 horas; 480 era demasiado
    DEBUG: bool = True                        # False en producción → oculta /docs

    RESEND_API_KEY: str = ""
    RESEND_FROM_EMAIL: str = "WafeAI <notificaciones@wafeai.co>"

    WHATSAPP_TOKEN: str = ""
    WHATSAPP_PHONE_ID: str = ""
    WHATSAPP_API_VERSION: str = "v21.0"

    ANTHROPIC_API_KEY: str = ""

    FRONTEND_URL: str = "http://localhost:5173"

    class Config:
        env_file = (".env", ".env.local")  # .env.local sobreescribe .env, nunca sube a git
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
