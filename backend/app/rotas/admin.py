from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, cast, Date
from app.database import get_db
from app.modelos import Usuario, Veiculo, Coleta, Viagem, Foto
from app.esquemas.usuario import UsuarioCreate, UsuarioResponse
from app.esquemas.veiculo import VeiculoCreate, VeiculoResponse
from app.utils import hash_password, verify_token
from typing import List, Optional
from datetime import datetime, timedelta
import pytz
from datetime import datetime, timedelta, date
from pytz import timezone as pytz_timezone

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

    # Timezone do Brasil
    tz = pytz.timezone('America/Sao_Paulo')
    
    agrupado = {}
    for foto, coleta in resultados:
        # Converter UTC para Brasil antes de extrair a data
        if foto.criado_em:
            criado_em_br = foto.criado_em.replace(tzinfo=pytz.utc).astimezone(tz)
            data = criado_em_br.date().isoformat()
            criado_em_str = criado_em_br.strftime("%Y-%m-%dT%H:%M:%S")
        else:
            data = "sem-data"
            criado_em_str = None
            
        if data not in agrupado:
            agrupado[data] = []
        agrupado[data].append({
            "id": foto.id,
            "coleta_id": coleta.id,
            "etapa": foto.etapa,
            "caminho": foto.caminho,
            "criado_em": criado_em_str
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
def relatorio_usuario_detalhado(
    usuario_id: str, 
    periodo: Optional[str] = Query("mes", description="hoje, semana, mes, personalizado"),
    data_inicio: Optional[str] = Query(None, description="Data início YYYY-MM-DD"),
    data_fim: Optional[str] = Query(None, description="Data fim YYYY-MM-DD"),
    current_admin: Usuario = Depends(get_current_admin), 
    db: Session = Depends(get_db)
):
    """Relatório detalhado de um usuário: KM por veículo com datas e filtro de período"""
    from app.modelos import Viagem
    from datetime import datetime, timedelta
    
    # Buscar usuário
    usuario = db.query(Usuario).filter(Usuario.usuario_id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Calcular período
    hoje = datetime.utcnow().date()
    if periodo == "personalizado" and data_inicio and data_fim:
        try:
            inicio = datetime.strptime(data_inicio, "%Y-%m-%d").date()
            fim = datetime.strptime(data_fim, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de data inválido. Use YYYY-MM-DD")
    elif periodo == "hoje":
        inicio = fim = hoje
    elif periodo == "semana":
        inicio = hoje - timedelta(days=7)
        fim = hoje
    elif periodo == "mes":
        inicio = hoje - timedelta(days=30)
        fim = hoje
    else:
        # Padrão: último mês
        inicio = hoje - timedelta(days=30)
        fim = hoje
    
    # Buscar coletas do usuário no período
    coletas = db.query(Coleta).filter(
        Coleta.usuario_id == usuario.id,
        Coleta.data_devolucao != None,
        cast(Coleta.data_devolucao, Date) >= inicio,
        cast(Coleta.data_devolucao, Date) <= fim
    ).order_by(Coleta.data_devolucao.desc()).all()
    
    # Organizar por dia
    uso_por_dia = {}
    km_total_periodo = 0
    total_coletas_periodo = 0
    
    # Timezone do Brasil (São Paulo)
    from datetime import timezone, timedelta as td
    tz_brasil = timezone(td(hours=-3))
    
    for coleta in coletas:
        veiculo = db.query(Veiculo).filter(Veiculo.id == coleta.veiculo_id).first()
        if not veiculo:
            continue
        
        # Data da devolução como chave
        dia = coleta.data_devolucao.date().isoformat()
        
        if dia not in uso_por_dia:
            uso_por_dia[dia] = {
                "data": dia,
                "usos": []
            }
        
        # Contar a devolução (km_devolucao - km_retirada)
        if coleta.km_devolucao and coleta.km_retirada:
            km_rodado = coleta.km_devolucao - coleta.km_retirada
            km_total_periodo += km_rodado
            total_coletas_periodo += 1
            
            # Convertendo horários para timezone local
            hora_saida = "N/A"
            hora_chegada = "N/A"
            
            if coleta.data_retirada:
                # Se for timezone-aware, converte; senão assume UTC
                dt_saida = coleta.data_retirada
                if dt_saida.tzinfo is None:
                    dt_saida = dt_saida.replace(tzinfo=timezone.utc)
                dt_saida_local = dt_saida.astimezone(tz_brasil)
                hora_saida = dt_saida_local.strftime("%H:%M")
            
            if coleta.data_devolucao:
                dt_chegada = coleta.data_devolucao
                if dt_chegada.tzinfo is None:
                    dt_chegada = dt_chegada.replace(tzinfo=timezone.utc)
                dt_chegada_local = dt_chegada.astimezone(tz_brasil)
                hora_chegada = dt_chegada_local.strftime("%H:%M")
            
            uso_por_dia[dia]["usos"].append({
                "coleta_id": coleta.id,
                "veiculo_placa": veiculo.placa,
                "veiculo_marca": veiculo.marca,
                "veiculo_modelo": veiculo.modelo,
                "hora_saida": hora_saida,
                "hora_chegada": hora_chegada,
                "km_retirada": coleta.km_retirada,
                "km_devolucao": coleta.km_devolucao,
                "km_rodado": round(km_rodado, 2),
                "observacoes_retirada": coleta.observacoes_retirada,
                "observacoes_devolucao": coleta.observacoes_devolucao
            })
    
    # Preparar resposta organizada por dia
    dias_list = []
    for dia, dados in sorted(uso_por_dia.items(), reverse=True):
        km_dia = sum(uso["km_rodado"] for uso in dados["usos"])
        dias_list.append({
            "data": dia,
            "km_total_dia": round(km_dia, 2),
            "total_usos": len(dados["usos"]),
            "usos": dados["usos"]
        })
    
    return {
        "usuario_id": usuario.usuario_id,
        "usuario_nome": usuario.nome,
        "periodo": {
            "tipo": periodo,
            "data_inicio": inicio.isoformat(),
            "data_fim": fim.isoformat(),
            "dias": (fim - inicio).days + 1
        },
        "estatisticas": {
            "km_total": round(km_total_periodo, 2),
            "total_coletas": total_coletas_periodo,
            "media_km_por_coleta": round(km_total_periodo / total_coletas_periodo, 2) if total_coletas_periodo > 0 else 0,
            "media_km_por_dia": round(km_total_periodo / ((fim - inicio).days + 1), 2)
        },
        "uso_por_dia": dias_list
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


# ===== RELATÓRIOS AVANÇADOS COM FILTROS =====

@router.get("/relatorios/periodo")
def relatorio_por_periodo(
    data_inicio: Optional[str] = Query(None, description="Data início YYYY-MM-DD"),
    data_fim: Optional[str] = Query(None, description="Data fim YYYY-MM-DD"),
    periodo: Optional[str] = Query("mes", description="hoje, semana, mes, trimestre, semestre, ano, personalizado"),
    current_admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Relatório com filtro de período customizável:
    - hoje: apenas hoje
    - semana: últimos 7 dias
    - mes: últimos 30 dias
    - trimestre: últimos 90 dias
    - semestre: últimos 180 dias
    - ano: últimos 365 dias
    - personalizado: usar data_inicio e data_fim
    """
    hoje = datetime.utcnow().date()
    
    # Definir período
    if periodo == "personalizado" and data_inicio and data_fim:
        try:
            inicio = datetime.strptime(data_inicio, "%Y-%m-%d").date()
            fim = datetime.strptime(data_fim, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de data inválido. Use YYYY-MM-DD")
    elif periodo == "hoje":
        inicio = fim = hoje
    elif periodo == "semana":
        inicio = hoje - timedelta(days=7)
        fim = hoje
    elif periodo == "mes":
        inicio = hoje - timedelta(days=30)
        fim = hoje
    elif periodo == "trimestre":
        inicio = hoje - timedelta(days=90)
        fim = hoje
    elif periodo == "semestre":
        inicio = hoje - timedelta(days=180)
        fim = hoje
    elif periodo == "ano":
        inicio = hoje - timedelta(days=365)
        fim = hoje
    else:
        # Padrão: último mês
        inicio = hoje - timedelta(days=30)
        fim = hoje
    
    # Relatório por veículo
    relatorio_veiculos = []
    veiculos = db.query(Veiculo).filter(Veiculo.ativo == True).all()
    
    for veiculo in veiculos:
        # Buscar coletas no período
        coletas = db.query(Coleta).filter(
            Coleta.veiculo_id == veiculo.id,
            Coleta.data_devolucao != None,
            cast(Coleta.data_devolucao, Date) >= inicio,
            cast(Coleta.data_devolucao, Date) <= fim
        ).all()
        
        km_total = 0
        total_usos = 0
        
        for coleta in coletas:
            if coleta.km_devolucao and coleta.km_retirada:
                km_coleta = coleta.km_devolucao - coleta.km_retirada
                km_total += km_coleta
                total_usos += 1
        
        if km_total > 0 or total_usos > 0:
            relatorio_veiculos.append({
                "veiculo_id": veiculo.id,
                "placa": veiculo.placa,
                "marca": veiculo.marca,
                "modelo": veiculo.modelo,
                "km_periodo": round(km_total, 2),
                "total_usos": total_usos,
                "media_km_por_uso": round(km_total / total_usos, 2) if total_usos > 0 else 0
            })
    
    # Relatório por motorista
    relatorio_motoristas = []
    usuarios = db.query(Usuario).filter(Usuario.is_admin == False, Usuario.ativo == True).all()
    
    for usuario in usuarios:
        coletas = db.query(Coleta).filter(
            Coleta.usuario_id == usuario.id,
            Coleta.data_devolucao != None,
            cast(Coleta.data_devolucao, Date) >= inicio,
            cast(Coleta.data_devolucao, Date) <= fim
        ).all()
        
        km_total = 0
        total_coletas = 0
        
        for coleta in coletas:
            if coleta.km_devolucao and coleta.km_retirada:
                km_coleta = coleta.km_devolucao - coleta.km_retirada
                km_total += km_coleta
                total_coletas += 1
        
        if km_total > 0 or total_coletas > 0:
            relatorio_motoristas.append({
                "usuario_id": usuario.usuario_id,
                "nome": usuario.nome,
                "km_periodo": round(km_total, 2),
                "total_coletas": total_coletas,
                "media_km_por_coleta": round(km_total / total_coletas, 2) if total_coletas > 0 else 0
            })
    
    # Estatísticas gerais
    km_total_frota = sum(v["km_periodo"] for v in relatorio_veiculos)
    total_usos_periodo = sum(v["total_usos"] for v in relatorio_veiculos)
    
    return {
        "periodo": {
            "tipo": periodo,
            "data_inicio": inicio.isoformat(),
            "data_fim": fim.isoformat(),
            "dias": (fim - inicio).days + 1
        },
        "estatisticas_gerais": {
            "km_total": round(km_total_frota, 2),
            "total_usos": total_usos_periodo,
            "media_km_por_dia": round(km_total_frota / ((fim - inicio).days + 1), 2),
            "veiculos_ativos": len([v for v in relatorio_veiculos if v["total_usos"] > 0]),
            "motoristas_ativos": len([m for m in relatorio_motoristas if m["total_coletas"] > 0])
        },
        "por_veiculo": sorted(relatorio_veiculos, key=lambda x: x["km_periodo"], reverse=True),
        "por_motorista": sorted(relatorio_motoristas, key=lambda x: x["km_periodo"], reverse=True)
    }


@router.get("/relatorios/veiculo/{veiculo_id}")
def relatorio_veiculo_detalhado(
    veiculo_id: int,
    data_inicio: Optional[str] = Query(None),
    data_fim: Optional[str] = Query(None),
    periodo: Optional[str] = Query("mes"),
    current_admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Relatório detalhado de um veículo com histórico de usos"""
    veiculo = db.query(Veiculo).filter(Veiculo.id == veiculo_id).first()
    if not veiculo:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")
    
    # Calcular período
    hoje = datetime.utcnow().date()
    if periodo == "personalizado" and data_inicio and data_fim:
        try:
            inicio = datetime.strptime(data_inicio, "%Y-%m-%d").date()
            fim = datetime.strptime(data_fim, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de data inválido")
    elif periodo == "semana":
        inicio = hoje - timedelta(days=7)
        fim = hoje
    elif periodo == "mes":
        inicio = hoje - timedelta(days=30)
        fim = hoje
    elif periodo == "trimestre":
        inicio = hoje - timedelta(days=90)
        fim = hoje
    elif periodo == "ano":
        inicio = hoje - timedelta(days=365)
        fim = hoje
    else:
        inicio = hoje - timedelta(days=30)
        fim = hoje
    
    # Buscar coletas no período
    coletas = db.query(Coleta).filter(
        Coleta.veiculo_id == veiculo_id,
        Coleta.data_devolucao != None,
        cast(Coleta.data_devolucao, Date) >= inicio,
        cast(Coleta.data_devolucao, Date) <= fim
    ).order_by(Coleta.data_retirada.desc()).all()
    
    historico = []
    km_total = 0
    
    for coleta in coletas:
        usuario = db.query(Usuario).filter(Usuario.id == coleta.usuario_id).first()
        
        if coleta.km_devolucao and coleta.km_retirada:
            km_rodado = coleta.km_devolucao - coleta.km_retirada
            km_total += km_rodado
            
            historico.append({
                "data_retirada": coleta.data_retirada.isoformat() if coleta.data_retirada else None,
                "data_devolucao": coleta.data_devolucao.isoformat() if coleta.data_devolucao else None,
                "motorista": usuario.nome if usuario else "N/A",
                "km_inicial": coleta.km_retirada,
                "km_final": coleta.km_devolucao,
                "km_rodado": round(km_rodado, 2),
                "observacoes_retirada": coleta.observacoes_retirada,
                "observacoes_devolucao": coleta.observacoes_devolucao
            })
    
    return {
        "veiculo": {
            "id": veiculo.id,
            "placa": veiculo.placa,
            "marca": veiculo.marca,
            "modelo": veiculo.modelo,
            "ano": veiculo.ano
        },
        "periodo": {
            "data_inicio": inicio.isoformat(),
            "data_fim": fim.isoformat(),
            "dias": (fim - inicio).days + 1
        },
        "estatisticas": {
            "km_total": round(km_total, 2),
            "total_usos": len(historico),
            "media_km_por_uso": round(km_total / len(historico), 2) if historico else 0,
            "media_km_por_dia": round(km_total / ((fim - inicio).days + 1), 2)
        },
        "historico": historico
    }


@router.get("/relatorios/consolidado")
def relatorio_consolidado(
    agrupar_por: str = Query("mes", description="dia, semana, mes"),
    data_inicio: Optional[str] = Query(None),
    data_fim: Optional[str] = Query(None),
    current_admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Relatório consolidado com agrupamento por período
    Ideal para gráficos de evolução de uso da frota
    """
    hoje = datetime.utcnow().date()
    
    # Definir intervalo padrão (último ano)
    if data_inicio and data_fim:
        try:
            inicio = datetime.strptime(data_inicio, "%Y-%m-%d").date()
            fim = datetime.strptime(data_fim, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de data inválido")
    else:
        inicio = hoje - timedelta(days=365)
        fim = hoje
    
    # Buscar todas as coletas no período
    coletas = db.query(Coleta).filter(
        Coleta.data_devolucao != None,
        cast(Coleta.data_devolucao, Date) >= inicio,
        cast(Coleta.data_devolucao, Date) <= fim
    ).all()
    
    # Agrupar por período
    consolidado = {}
    
    for coleta in coletas:
        if not (coleta.km_devolucao and coleta.km_retirada and coleta.data_devolucao):
            continue
        
        data = coleta.data_devolucao.date() if isinstance(coleta.data_devolucao, datetime) else coleta.data_devolucao
        
        # Determinar chave de agrupamento
        if agrupar_por == "dia":
            chave = data.isoformat()
        elif agrupar_por == "semana":
            # ISO week (ano-semana)
            chave = f"{data.isocalendar()[0]}-W{data.isocalendar()[1]:02d}"
        else:  # mes
            chave = f"{data.year}-{data.month:02d}"
        
        if chave not in consolidado:
            consolidado[chave] = {
                "periodo": chave,
                "km_total": 0,
                "total_usos": 0,
                "veiculos_distintos": set(),
                "motoristas_distintos": set()
            }
        
        km_rodado = coleta.km_devolucao - coleta.km_retirada
        consolidado[chave]["km_total"] += km_rodado
        consolidado[chave]["total_usos"] += 1
        consolidado[chave]["veiculos_distintos"].add(coleta.veiculo_id)
        consolidado[chave]["motoristas_distintos"].add(coleta.usuario_id)
    
    # Converter sets para contagens
    resultado = []
    for chave in sorted(consolidado.keys()):
        item = consolidado[chave]
        resultado.append({
            "periodo": item["periodo"],
            "km_total": round(item["km_total"], 2),
            "total_usos": item["total_usos"],
            "veiculos_ativos": len(item["veiculos_distintos"]),
            "motoristas_ativos": len(item["motoristas_distintos"]),
            "media_km_por_uso": round(item["km_total"] / item["total_usos"], 2) if item["total_usos"] > 0 else 0
        })
    
    return {
        "agrupamento": agrupar_por,
        "periodo_total": {
            "data_inicio": inicio.isoformat(),
            "data_fim": fim.isoformat()
        },
        "dados": resultado,
        "total_periodos": len(resultado),
        "km_total_geral": round(sum(r["km_total"] for r in resultado), 2)
    }

# ===== EDIÇÃO DE KM (APENAS ADMIN, MESMO DIA) =====
@router.put("/coleta/{coleta_id}/editar-km")
def editar_km_coleta(
    coleta_id: int,
    dados: dict,
    current_admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Permite ao admin editar KM de retirada e devolução de uma coleta,
    mas apenas no mesmo dia da devolução (timezone Brasil).
    """
    coleta = db.query(Coleta).filter(Coleta.id == coleta_id).first()
    if not coleta:
        raise HTTPException(status_code=404, detail="Coleta não encontrada")
    
    if not coleta.data_devolucao:
        raise HTTPException(status_code=400, detail="Coleta ainda não foi devolvida")
    
    # Validar se é o mesmo dia (timezone Brasil)
    tz_brasil = pytz_timezone('America/Sao_Paulo')
    data_devolucao_local = coleta.data_devolucao.replace(tzinfo=pytz_timezone('UTC')).astimezone(tz_brasil).date()
    hoje_local = datetime.now(tz_brasil).date()
    
    if data_devolucao_local != hoje_local:
        raise HTTPException(
            status_code=403,
            detail=f"Edição permitida apenas no mesmo dia. Devolução foi em {data_devolucao_local.strftime('%d/%m/%Y')}"
        )
    
    # Validar KMs
    km_retirada = dados.get("km_retirada")
    km_devolucao = dados.get("km_devolucao")
    
    if km_retirada is not None:
        km_retirada = float(km_retirada)
        if km_retirada < 0:
            raise HTTPException(status_code=400, detail="KM de retirada deve ser positivo")
        coleta.km_retirada = km_retirada
    
    if km_devolucao is not None:
        km_devolucao = float(km_devolucao)
        if km_devolucao < 0:
            raise HTTPException(status_code=400, detail="KM de devolução deve ser positivo")
        if km_devolucao < coleta.km_retirada:
            raise HTTPException(status_code=400, detail="KM de devolução não pode ser menor que KM de retirada")
        coleta.km_devolucao = km_devolucao
    
    db.commit()
    db.refresh(coleta)
    
    return {
        "mensagem": "KM atualizado com sucesso",
        "coleta_id": coleta.id,
        "km_retirada": coleta.km_retirada,
        "km_devolucao": coleta.km_devolucao,
        "km_rodado": round(coleta.km_devolucao - coleta.km_retirada, 2)
    }
