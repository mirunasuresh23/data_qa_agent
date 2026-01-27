"""Configuration settings for the Data QA Agent backend."""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings."""
    
    # Application
    app_name: str = "Data QA Agent Backend"
    debug: bool = False
    
    # Google Cloud
    google_cloud_project: str = ""  # Picks up from GOOGLE_CLOUD_PROJECT env var
    google_cloud_region: str = "australia-southeast1"   # Default region
    vertex_ai_location: str = "australia-southeast1"    # Picks up from VERTEX_AI_LOCATION env var (defaults to google_cloud_region)
    vertex_ai_model: str = "gemini-2.5-flash"
    
    # CORS
    cors_origins: list[str] = [
        "http://localhost:3000",
        "https://data-qa-agent-*.run.app"
    ]
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
