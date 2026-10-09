import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

is_vercel = bool(os.environ.get("VERCEL"))
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
default_db = "sqlite:////tmp/defaulter.db" if is_vercel else f"sqlite:///{os.path.join(backend_dir, 'defaulter.db').replace(os.sep, '/')}"
default_upload = "/tmp/uploads" if is_vercel else os.path.join(backend_dir, "uploads")

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "Court Order & Payment Agreement Defaulter App"
    DATABASE_URL: str = default_db
    UPLOAD_DIR: str = default_upload
    
    # Supabase (optional cloud credentials)
    SUPABASE_URL: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    
    # Gemini AI
    GEMINI_API_KEY: Optional[str] = None
    
    # Fixed Plaintiff Information (Configurable in system settings/env)
    DEFAULT_PLAINTIFF_NAME: str = "Universal Merchant Bank"
    DEFAULT_PLAINTIFF_ADDRESS: str = "[PLAINTIFF ADDRESS]"
    DEFAULT_PLAINTIFF_CONTACT: str = "[PLAINTIFF CONTACT]"

settings = Settings()

try:
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
except OSError:
    pass
