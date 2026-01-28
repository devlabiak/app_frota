from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Ambiente
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    
    # Segurança
    SECRET_KEY: str = "sua-chave-secreta-muito-segura-mude-em-producao"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 horas (aumentado de 11)
    
    # Upload
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 50 * 1024 * 1024  # 50MB (aumentado de 10MB)
    
    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_PER_MINUTE: int = 60
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    # Database
    DATABASE_URL: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
