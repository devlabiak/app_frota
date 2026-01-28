from pydantic import BaseModel
from datetime import datetime

class VeiculoCreate(BaseModel):
    placa: str
    modelo: str
    marca: str
    ano: int
    km_inicial: float  # KM inicial do veículo (admin preenche)

class VeiculoResponse(BaseModel):
    id: int
    placa: str
    modelo: str
    marca: str
    ano: int
    km_atual: float
    ativo: bool
    criado_em: datetime

    class Config:
        from_attributes = True
