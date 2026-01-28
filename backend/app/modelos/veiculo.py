from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Veiculo(Base):
    __tablename__ = "veiculos"

    id = Column(Integer, primary_key=True, index=True)
    placa = Column(String, unique=True, index=True)
    modelo = Column(String)
    marca = Column(String)
    ano = Column(Integer)
    km_atual = Column(Float, default=0)  # Último KM registrado na devolução
    ativo = Column(Boolean, default=True)
    criado_em = Column(DateTime, default=datetime.utcnow)

    coletas = relationship("Coleta", back_populates="veiculo")
