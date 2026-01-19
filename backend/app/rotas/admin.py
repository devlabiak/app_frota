from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.modelos import Usuario, Veiculo, Coleta, Viagem, Foto
from app.esquemas.usuario import UsuarioCreate, UsuarioResponse
from app.esquemas.veiculo import VeiculoCreate, VeiculoResponse
from app.utils import hash_password, verify_token
from typing import List

router = APIRouter(prefix="/api/admin", tags=["admin"])
security = HTTPBearer()

def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    usuario_id = verify_token(credentials.credentials)
    if not usuario_id:
        raise HTTPException(status_code=401, detail="Token inválido")
    
    usuario = db.query(Usuario).filter(Usuario.usuario_id == usuario_id).first()
    if not usuario or not usuario.is_admin:
        raise HTTPException(status_code=403, detail="Acesso negado - apenas administradores")
    
    return usuario

# ===== USUÁRIOS =====
@router.post("/usuarios", response_model=UsuarioResponse)
def criar_usuario(usuario: UsuarioCreate, current_admin: Usuario = Depends(get_current_admin), db: Session = Depends(get_db)):
    # Validar ID duplicado
    db_usuario = db.query(Usuario).filter(Usuario.usuario_id == usuario.usuario_id).first()
    if db_usuario:
        raise HTTPException(status_code=400, detail="ID de usuário já existe")
    
    # Validar nome duplicado
    db_nome = db.query(Usuario).filter(Usuario.nome == usuario.nome).first()
    if db_nome:
        raise HTTPException(status_code=400, detail="Nome de usuário já existe")
    
    novo_usuario = Usuario(
        usuario_id=usuario.usuario_id,
        nome=usuario.nome,
        senha_hash=hash_password(usuario.senha),
        is_admin=usuario.is_admin
    )
    db.add(novo_usuario)
    db.commit()
    db.refresh(novo_usuario)
    return novo_usuario

@router.get("/usuarios", response_model=List[UsuarioResponse])
def listar_usuarios(current_admin: Usuario = Depends(get_current_admin), db: Session = Depends(get_db)):
    return db.query(Usuario).all()

@router.delete("/usuarios/{usuario_id}")
def deletar_usuario(usuario_id: str, current_admin: Usuario = Depends(get_current_admin), db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.usuario_id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    db.delete(usuario)
    db.commit()
    return {"mensagem": "Usuário deletado com sucesso"}

@router.put("/usuarios/{usuario_id}/senha")
def atualizar_senha(usuario_id: str, nova_senha: dict, current_admin: Usuario = Depends(get_current_admin), db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.usuario_id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    usuario.senha_hash = hash_password(nova_senha["nova_senha"])
    db.commit()
    return {"mensagem": "Senha atualizada com sucesso"}

@router.put("/usuarios/{usuario_id}/admin")
def atualizar_privilegio_admin(usuario_id: str, dados: dict, current_admin: Usuario = Depends(get_current_admin), db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.usuario_id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    usuario.is_admin = dados.get("is_admin", False)
    db.commit()
    return {"mensagem": "Privilégio atualizado com sucesso"}

# ===== VEÍCULOS =====
@router.post("/veiculos", response_model=VeiculoResponse)
def criar_veiculo(veiculo: VeiculoCreate, current_admin: Usuario = Depends(get_current_admin), db: Session = Depends(get_db)):
    db_veiculo = db.query(Veiculo).filter(Veiculo.placa == veiculo.placa).first()
    if db_veiculo:
        raise HTTPException(status_code=400, detail="Placa já cadastrada")
    
    novo_veiculo = Veiculo(
        placa=veiculo.placa,
        modelo=veiculo.modelo,
        marca=veiculo.marca,
        ano=veiculo.ano
    )
    db.add(novo_veiculo)
    db.commit()
    db.refresh(novo_veiculo)
    return novo_veiculo

@router.get("/veiculos", response_model=List[VeiculoResponse])
def listar_veiculos(current_admin: Usuario = Depends(get_current_admin), db: Session = Depends(get_db)):
    return db.query(Veiculo).filter(Veiculo.ativo == True).all()

@router.delete("/veiculos/{veiculo_id}")
def deletar_veiculo(veiculo_id: int, current_admin: Usuario = Depends(get_current_admin), db: Session = Depends(get_db)):
    veiculo = db.query(Veiculo).filter(Veiculo.id == veiculo_id).first()
    if not veiculo:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")
    
    # Marcar como inativo ao invés de deletar
    veiculo.ativo = False
    db.commit()
    return {"mensagem": "Veículo deletado com sucesso"}

# ===== RELATÓRIOS =====
@router.get("/relatorios")
def gerar_relatorio(current_admin: Usuario = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Relatório geral: KM por veículo (sem mencionar usuários)"""
    from datetime import datetime, timedelta
    from app.modelos import Viagem
    
    relatorio_veiculos = []
    veiculos = db.query(Veiculo).filter(Veiculo.ativo == True).all()
    
    hoje = datetime.utcnow().date()
    uma_semana_atras = hoje - timedelta(days=7)
    um_mes_atras = hoje - timedelta(days=30)
    
    for veiculo in veiculos:
        # Buscar todas as coletas deste veículo
        coletas = db.query(Coleta).filter(Coleta.veiculo_id == veiculo.id).all()
        
        km_total = 0
        km_hoje = 0
        km_semana = 0
        km_mes = 0
        
        for coleta in coletas:
            # Calcular KM da devolução (km_devolucao - km_retirada)
            if coleta.km_devolucao and coleta.km_retirada:
                km_coleta = coleta.km_devolucao - coleta.km_retirada
                km_total += km_coleta
                
                if coleta.data_devolucao:
                    data_coleta = coleta.data_devolucao.date() if isinstance(coleta.data_devolucao, datetime) else coleta.data_devolucao
                    
                    if data_coleta == hoje:
                        km_hoje += km_coleta
                    if data_coleta >= uma_semana_atras:
                        km_semana += km_coleta
                    if data_coleta >= um_mes_atras:
                        km_mes += km_coleta
            
            # TAMBÉM contar viagens intermédias (sair/retornar)
            viagens = db.query(Viagem).filter(Viagem.coleta_id == coleta.id).all()
            for viagem in viagens:
                if viagem.km_rodado:
                    km_total += viagem.km_rodado
                    
                    if viagem.saida_horario:
                        data_viagem = viagem.saida_horario.date() if isinstance(viagem.saida_horario, datetime) else viagem.saida_horario
                        
                        if data_viagem == hoje:
                            km_hoje += viagem.km_rodado
                        if data_viagem >= uma_semana_atras:
                            km_semana += viagem.km_rodado
                        if data_viagem >= um_mes_atras:
                            km_mes += viagem.km_rodado
        
        relatorio_veiculos.append({
            "veiculo_id": veiculo.id,
            "placa": veiculo.placa,
            "marca": veiculo.marca,
            "modelo": veiculo.modelo,
            "km_hoje": round(km_hoje, 2),
            "km_semana": round(km_semana, 2),
            "km_mes": round(km_mes, 2),
            "km_total": round(km_total, 2)
        })
    
    return {
        "tipo": "resumo_veiculos",
        "relatorio": relatorio_veiculos
    }

@router.get("/fotos/{usuario_id}")
def listar_fotos_usuario(usuario_id: str, current_admin: Usuario = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Lista fotos de um usuário agrupadas por dia"""
    # Garantir que usuário existe
    usuario = db.query(Usuario).filter(Usuario.usuario_id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    # Buscar fotos vinculadas às coletas do usuário
    resultados = db.query(Foto, Coleta).join(Coleta, Foto.coleta_id == Coleta.id).join(Usuario, Coleta.usuario_id == Usuario.id)
    resultados = resultados.filter(Usuario.usuario_id == usuario_id).order_by(Foto.criado_em.desc()).all()

    agrupado = {}
    for foto, coleta in resultados:
        data = foto.criado_em.date().isoformat() if foto.criado_em else "sem-data"
        if data not in agrupado:
            agrupado[data] = []
        agrupado[data].append({
            "id": foto.id,
            "coleta_id": coleta.id,
            "etapa": foto.etapa,
            "caminho": foto.caminho,
            "criado_em": foto.criado_em.strftime("%Y-%m-%dT%H:%M:%S") if foto.criado_em else None
        })

    fotos_por_dia = [
        {"data": data, "fotos": itens}
        for data, itens in sorted(agrupado.items(), reverse=True)
    ]

    return {
        "usuario_id": usuario.usuario_id,
        "usuario_nome": usuario.nome,
        "fotos_por_dia": fotos_por_dia
    }

@router.get("/relatorios/usuario/{usuario_id}")
def relatorio_usuario_detalhado(usuario_id: str, current_admin: Usuario = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Relatório detalhado de um usuário: KM por veículo com datas"""
    from app.modelos import Viagem
    from datetime import datetime, timedelta
    
    # Buscar usuário
    usuario = db.query(Usuario).filter(Usuario.usuario_id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Buscar todas as coletas do usuário
    coletas = db.query(Coleta).filter(Coleta.usuario_id == usuario.id).all()
    
    # Organizar por veículo
    uso_por_veiculo = {}
    
    hoje = datetime.utcnow().date()
    um_mes_atras = hoje - timedelta(days=30)
    
    for coleta in coletas:
        veiculo = db.query(Veiculo).filter(Veiculo.id == coleta.veiculo_id).first()
        if not veiculo:
            continue
        
        if veiculo.placa not in uso_por_veiculo:
            uso_por_veiculo[veiculo.placa] = {
                "veiculo_id": veiculo.id,
                "placa": veiculo.placa,
                "marca": veiculo.marca,
                "modelo": veiculo.modelo,
                "km_total": 0,
                "km_mes": 0,
                "total_retiradas": 0,
                "usos": []
            }
        
        # Contar a devolução (km_devolucao - km_retirada)
        if coleta.km_devolucao and coleta.km_retirada:
            km_devolucao = coleta.km_devolucao - coleta.km_retirada
            uso_por_veiculo[veiculo.placa]["km_total"] += km_devolucao
            uso_por_veiculo[veiculo.placa]["total_retiradas"] += 1
            
            if coleta.data_devolucao:
                data_dev = coleta.data_devolucao.date() if isinstance(coleta.data_devolucao, datetime) else coleta.data_devolucao
                if data_dev >= um_mes_atras:
                    uso_por_veiculo[veiculo.placa]["km_mes"] += km_devolucao
            
            uso_por_veiculo[veiculo.placa]["usos"].append({
                "data_retirada": coleta.data_retirada.isoformat() if coleta.data_retirada else None,
                "km_retirada": coleta.km_retirada,
                "data_devolucao": coleta.data_devolucao.isoformat() if coleta.data_devolucao else None,
                "km_devolucao": coleta.km_devolucao,
                "km_rodado": round(km_devolucao, 2),
                "observacoes_retirada": coleta.observacoes_retirada,
                "observacoes_devolucao": coleta.observacoes_devolucao
            })
        
        # Buscar viagens desta coleta (sair/retornar)
        viagens = db.query(Viagem).filter(Viagem.coleta_id == coleta.id).all()
        
        for viagem in viagens:
            if viagem.km_rodado:
                uso_por_veiculo[veiculo.placa]["km_total"] += viagem.km_rodado
                uso_por_veiculo[veiculo.placa]["total_retiradas"] += 1
                
                if viagem.saida_horario:
                    data_viagem = viagem.saida_horario.date()
                    if data_viagem >= um_mes_atras:
                        uso_por_veiculo[veiculo.placa]["km_mes"] += viagem.km_rodado
                
                uso_por_veiculo[veiculo.placa]["usos"].append({
                    "numero": viagem.numero_viagem,
                    "saida_horario": viagem.saida_horario.isoformat() if viagem.saida_horario else None,
                    "saida_km": viagem.saida_km,
                    "retorno_horario": viagem.retorno_horario.isoformat() if viagem.retorno_horario else None,
                    "retorno_km": viagem.retorno_km,
                    "km_rodado": round(viagem.km_rodado, 2),
                    "observacoes_saida": viagem.saida_observacoes,
                    "observacoes_retorno": viagem.retorno_observacoes
                })
    
    # Calcular totais
    km_total_usuario = sum(v["km_total"] for v in uso_por_veiculo.values())
    km_mes_usuario = sum(v["km_mes"] for v in uso_por_veiculo.values())
    total_retiradas = sum(v["total_retiradas"] for v in uso_por_veiculo.values())
    
    return {
        "usuario_id": usuario.usuario_id,
        "usuario_nome": usuario.nome,
        "total_km": round(km_total_usuario, 2),
        "total_km_mes": round(km_mes_usuario, 2),
        "total_retiradas": total_retiradas,
        "total_veiculos_utilizados": len(uso_por_veiculo),
        "uso_por_veiculo": list(uso_por_veiculo.values())
    }

@router.get("/relatorios/detalhado")
def gerar_relatorio_detalhado(current_admin: Usuario = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Gera relatório detalhado com km por veículo e por usuário"""
    from datetime import datetime, timedelta
    from app.modelos import Viagem
    
    # Relatório de KM por veículo
    relatorio_veiculos = []
    veiculos = db.query(Veiculo).filter(Veiculo.ativo == True).all()
    
    hoje = datetime.utcnow().date()
    uma_semana_atras = hoje - timedelta(days=7)
    um_mes_atras = hoje - timedelta(days=30)
    
    for veiculo in veiculos:
        coletas = db.query(Coleta).filter(Coleta.veiculo_id == veiculo.id).all()
        
        km_total = 0
        km_hoje = 0
        km_semana = 0
        km_mes = 0
        
        for coleta in coletas:
            viagens = db.query(Viagem).filter(Viagem.coleta_id == coleta.id).all()
            
            for viagem in viagens:
                if viagem.km_rodado:
                    km_total += viagem.km_rodado
                    
                    if viagem.saida_horario:
                        data_viagem = viagem.saida_horario.date()
                        
                        if data_viagem == hoje:
                            km_hoje += viagem.km_rodado
                        if data_viagem >= uma_semana_atras:
                            km_semana += viagem.km_rodado
                        if data_viagem >= um_mes_atras:
                            km_mes += viagem.km_rodado
        
        relatorio_veiculos.append({
            "veiculo_id": veiculo.id,
            "placa": veiculo.placa,
            "marca": veiculo.marca,
            "modelo": veiculo.modelo,
            "km_hoje": round(km_hoje, 2),
            "km_semana": round(km_semana, 2),
            "km_mes": round(km_mes, 2),
            "km_total": round(km_total, 2)
        })
    
    # Relatório de usuários e suas coletas
    relatorio_usuarios = []
    usuarios = db.query(Usuario).filter(Usuario.is_admin == False).all()
    
    for usuario in usuarios:
        coletas = db.query(Coleta).filter(Coleta.usuario_id == usuario.id).all()
        
        coletas_detalhes = []
        km_usuario = 0
        
        for coleta in coletas:
            veiculo = db.query(Veiculo).filter(Veiculo.id == coleta.veiculo_id).first()
            viagens = db.query(Viagem).filter(Viagem.coleta_id == coleta.id).all()
            
            km_coleta = sum(v.km_rodado for v in viagens if v.km_rodado)
            km_usuario += km_coleta
            
            viagens_detalhes = []
            for viagem in viagens:
                viagens_detalhes.append({
                    "numero": viagem.numero_viagem,
                    "saida_horario": viagem.saida_horario.isoformat() if viagem.saida_horario else None,
                    "saida_km": viagem.saida_km,
                    "retorno_horario": viagem.retorno_horario.isoformat() if viagem.retorno_horario else None,
                    "retorno_km": viagem.retorno_km,
                    "km_rodado": viagem.km_rodado
                })
            
            coletas_detalhes.append({
                "coleta_id": coleta.id,
                "veiculo_placa": veiculo.placa if veiculo else "N/A",
                "veiculo_marca": veiculo.marca if veiculo else "N/A",
                "veiculo_modelo": veiculo.modelo if veiculo else "N/A",
                "km_total": round(km_coleta, 2),
                "data_retirada": coleta.data_retirada.isoformat() if coleta.data_retirada else None,
                "data_devolucao": coleta.data_devolucao.isoformat() if coleta.data_devolucao else None,
                "viagens": viagens_detalhes
            })
        
        relatorio_usuarios.append({
            "usuario_id": usuario.usuario_id,
            "usuario_nome": usuario.nome,
            "total_km": round(km_usuario, 2),
            "total_coletas": len(coletas),
            "coletas": coletas_detalhes
        })
    
    return {
        "relatorio_veiculos": relatorio_veiculos,
        "relatorio_usuarios": relatorio_usuarios
    }

