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
    engine = create_engine(
        DATABASE_URL, 
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        pool_recycle=3600
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
