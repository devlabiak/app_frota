from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class UsuarioCreate(BaseModel):
    usuario_id: str
    nome: str
    senha: str
    is_admin: bool = False

class UsuarioLogin(BaseModel):
    usuario_id: str
    senha: str

class UsuarioResponse(BaseModel):
    id: int
    usuario_id: str
    nome: str
    is_admin: bool
    ativo: bool
    criado_em: datetime

    class Config:
        from_attributes = True
