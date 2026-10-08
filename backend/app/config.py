import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "Court Order & Payment Agreement Defaulter App"
    DATABASE_URL: str = "sqlite:///./defaulter.db"
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
    
    # Supabase (optional cloud credentials)
    SUPABASE_URL: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    
    # Gemini AI
    GEMINI_API_KEY: Optional[str] = None
    
    # Fixed Plaintiff Information (Configurable in system settings/env)
    DEFAULT_PLAINTIFF_NAME: str = "[PLAINTIFF NAME]"
    DEFAULT_PLAINTIFF_ADDRESS: str = "[PLAINTIFF ADDRESS]"
    DEFAULT_PLAINTIFF_CONTACT: str = "[PLAINTIFF CONTACT]"

settings = Settings()
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
