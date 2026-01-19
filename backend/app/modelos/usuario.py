from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(String, unique=True, index=True)  # ID do usuário (ex: "001", "MOTO001")
    nome = Column(String, index=True)
    senha_hash = Column(String)
    is_admin = Column(Boolean, default=False)
    ativo = Column(Boolean, default=True)
    criado_em = Column(DateTime, default=datetime.utcnow)

    coletas = relationship("Coleta", back_populates="usuario")
