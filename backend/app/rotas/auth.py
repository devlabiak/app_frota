from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.modelos import Usuario
from app.esquemas import UsuarioLogin
from app.utils import verify_password, create_access_token, verify_token
from datetime import timedelta

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/login")
def login(usuario_login: UsuarioLogin, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.usuario_id == usuario_login.usuario_id).first()
    
    if not usuario or not verify_password(usuario_login.senha, usuario.senha_hash):
        raise HTTPException(status_code=401, detail="Usuário ou senha inválidos")
    
    if not usuario.ativo:
        raise HTTPException(status_code=403, detail="Usuário inativo")
    
    access_token = create_access_token(data={"sub": usuario.usuario_id})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "usuario_id": usuario.id,
        "usuario_nome": usuario.nome,
        "is_admin": usuario.is_admin
    }

@router.post("/verificar-token")
def verificar_token(token: str):
    usuario_id = verify_token(token)
    if not usuario_id:
        raise HTTPException(status_code=401, detail="Token inválido")
    return {"usuario_id": usuario_id, "valido": True}
