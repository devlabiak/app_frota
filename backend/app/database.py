from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from pathlib import Path

# Criar pastas necessárias (usar path relativo)
base_dir = Path(__file__).resolve().parent.parent.parent
data_dir = base_dir / "data"
uploads_dir = base_dir / "uploads"

data_dir.mkdir(exist_ok=True)
uploads_dir.mkdir(exist_ok=True)

# Configurar banco de dados
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./frota.db")

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    # PostgreSQL - melhor configuração para produção
    # Pool aumentado para suportar 4 workers + picos de tráfego
    engine = create_engine(
        DATABASE_URL, 
        pool_pre_ping=True,
        pool_size=50,        # Aumentado para 50 conexões base
        max_overflow=50,     # Aumentado para 50 overflow = 100 total
        pool_recycle=3600,   # Recicla conexões a cada 1 hora
        echo_pool=False      # Desabilitar logs de pool (muito verbose)
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
