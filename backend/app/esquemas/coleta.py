from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

class AvariaCreate(BaseModel):
    tipo: str
    observacoes: str

class ColetaCreate(BaseModel):
    veiculo_id: str
    km: float
    avarias: List[AvariaCreate] = []

class ColetaResponse(BaseModel):
    id: int
    usuario_id: int
    veiculo_id: str
    km: float
    criado_em: datetime

    class Config:
        from_attributes = True
