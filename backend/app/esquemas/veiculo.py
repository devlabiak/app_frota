from pydantic import BaseModel
from datetime import datetime

class VeiculoCreate(BaseModel):
    placa: str
    modelo: str
    marca: str
    ano: int

class VeiculoResponse(BaseModel):
    id: int
    placa: str
    modelo: str
    marca: str
    ano: int
    ativo: bool
    criado_em: datetime

    class Config:
        from_attributes = True
