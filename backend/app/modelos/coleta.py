from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Coleta(Base):
    """
    Representa a retirada de um veículo pelo usuário.
    Pode ter múltiplas viagens (saída/retorno) durante sua duração.
    """
    __tablename__ = "coletas"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    veiculo_id = Column(Integer, ForeignKey("veiculos.id"))
    
    # Dados da retirada
    data_retirada = Column(DateTime, default=datetime.utcnow)
    km_retirada = Column(Float)  # KM do veículo na retirada
    observacoes_retirada = Column(Text)  # Observações na retirada
    
    # Dados da devolução
    data_devolucao = Column(DateTime)  # NULL enquanto ativo
    km_devolucao = Column(Float)  # KM do veículo na devolução
    observacoes_devolucao = Column(Text)  # Observações na devolução
    
    # Status
    ativo = Column(Boolean, default=True)  # FALSE quando devolvido
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    usuario = relationship("Usuario", back_populates="coletas")
    veiculo = relationship("Veiculo", back_populates="coletas")
    viagens = relationship("Viagem", back_populates="coleta", cascade="all, delete-orphan")
    fotos = relationship("Foto", back_populates="coleta", cascade="all, delete-orphan")


class Viagem(Base):
    """
    Representa uma saída e retorno dentro de uma coleta.
    Uma coleta pode ter múltiplas viagens.
    """
    __tablename__ = "viagens"

    id = Column(Integer, primary_key=True, index=True)
    coleta_id = Column(Integer, ForeignKey("coletas.id"))
    
    # Saída
    saida_horario = Column(DateTime)
    saida_km = Column(Float)
    saida_observacoes = Column(Text)
    
    # Retorno
    retorno_horario = Column(DateTime)  # NULL enquanto saída não retornou
    retorno_km = Column(Float)
    retorno_observacoes = Column(Text)
    
    # Sequência da viagem
    numero_viagem = Column(Integer)  # 1ª, 2ª, 3ª viagem...
    km_rodado = Column(Float)  # retorno_km - saida_km
    
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    coleta = relationship("Coleta", back_populates="viagens")

class Foto(Base):
    __tablename__ = "fotos"

    id = Column(Integer, primary_key=True, index=True)
    coleta_id = Column(Integer, ForeignKey("coletas.id"))
    etapa = Column(String)  # Ex: "saida_1", "retorno_1", "saida_2", etc
    caminho = Column(String)
    criado_em = Column(DateTime, default=datetime.utcnow)

    coleta = relationship("Coleta", back_populates="fotos")
