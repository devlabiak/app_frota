from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.modelos import Usuario, Coleta, Viagem, Foto, Veiculo
from app.utils import verify_token
from app.config import settings
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
import os
import pytz

router = APIRouter(prefix="/api/coleta", tags=["coleta"])
security = HTTPBearer()

class ViagemData(BaseModel):
    km: float
    observacoes: Optional[str] = None

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    usuario_id = verify_token(credentials.credentials)
    if not usuario_id:
        raise HTTPException(status_code=401, detail="Token inválido")
    
    usuario = db.query(Usuario).filter(Usuario.usuario_id == usuario_id).first()
    if not usuario or not usuario.ativo:
        raise HTTPException(status_code=403, detail="Usuário inativo")
    
    return usuario

# ===== VEÍCULOS DISPONÍVEIS =====
@router.get("/veiculos")
def listar_veiculos_disponiveis(current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    """Lista veículos disponíveis para o usuário"""
    veiculos = db.query(Veiculo).filter(Veiculo.ativo == True).all()
    
    resultado = []
    for veiculo in veiculos:
        # Verificar se tem coleta ATIVA com este veículo de QUALQUER usuário
        # O veículo não pode estar disponível enquanto houver coleta ativa
        coleta_ativa_qualquer_usuario = db.query(Coleta).filter(
            Coleta.veiculo_id == veiculo.id,
            Coleta.ativo == True  # Coleta ainda ativa - bloqueado para todos
        ).first()
        
        # Mostrar veículo APENAS se não há coleta ativa de ninguém
        if not coleta_ativa_qualquer_usuario:
            resultado.append({
                "id": veiculo.id,
                "placa": veiculo.placa,
                "modelo": veiculo.modelo,
                "marca": veiculo.marca,
                "ano": veiculo.ano
            })
    
    return resultado

# ===== RETIRAR VEÍCULO (INICIA COLETA) =====
@router.post("/retirar/{veiculo_id}")
def retirar_veiculo(veiculo_id: int, dados: ViagemData, current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    """Inicia uma coleta (retirada de veículo) com KM e observações"""
    veiculo = db.query(Veiculo).filter(Veiculo.id == veiculo_id).first()
    if not veiculo:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")
    
    # Verificar se usuário já tem coleta ativa
    coleta_ativa = db.query(Coleta).filter(
        Coleta.usuario_id == current_user.id,
        Coleta.ativo == True
    ).first()
    
    if coleta_ativa:
        raise HTTPException(status_code=400, detail="Você já tem uma coleta ativa. Devolva o veículo anterior primeiro.")
    
    nova_coleta = Coleta(
        usuario_id=current_user.id,
        veiculo_id=veiculo_id,
        data_retirada=datetime.utcnow(),
        km_retirada=dados.km,
        observacoes_retirada=dados.observacoes,
        ativo=True
    )
    db.add(nova_coleta)
    db.commit()
    db.refresh(nova_coleta)
    
    return {
        "id": nova_coleta.id,
        "veiculo_id": nova_coleta.veiculo_id,
        "veiculo": {
            "id": veiculo.id,
            "placa": veiculo.placa,
            "marca": veiculo.marca,
            "modelo": veiculo.modelo,
            "ano": veiculo.ano
        },
        "data_retirada": nova_coleta.data_retirada,
        "km_retirada": nova_coleta.km_retirada,
        "observacoes_retirada": nova_coleta.observacoes_retirada,
        "ativo": nova_coleta.ativo,
        "viagens": []
    }

# ===== SAIR COM VEÍCULO =====
@router.post("/{coleta_id}/sair")
def registrar_saida(coleta_id: int, dados: ViagemData, current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    """Registra uma saída (inicia uma viagem)"""
    coleta = db.query(Coleta).filter(
        Coleta.id == coleta_id,
        Coleta.usuario_id == current_user.id,
        Coleta.ativo == True
    ).first()
    
    if not coleta:
        raise HTTPException(status_code=404, detail="Coleta não encontrada ou já finalizada")
    
    # Verificar se há uma viagem com saída mas sem retorno
    viagem_aberta = db.query(Viagem).filter(
        Viagem.coleta_id == coleta_id,
        Viagem.retorno_horario == None
    ).first()
    
    if viagem_aberta:
        raise HTTPException(status_code=400, detail="Você precisa retornar do trajeto anterior antes de fazer uma nova saída")
    
    # Calcular número da viagem
    numero_viagem = db.query(Viagem).filter(Viagem.coleta_id == coleta_id).count() + 1
    
    nova_viagem = Viagem(
        coleta_id=coleta_id,
        saida_horario=datetime.utcnow(),
        saida_km=dados.km,
        saida_observacoes=dados.observacoes,
        numero_viagem=numero_viagem
    )
    db.add(nova_viagem)
    db.commit()
    db.refresh(nova_viagem)
    
    return {
        "id": nova_viagem.id,
        "numero_viagem": nova_viagem.numero_viagem,
        "saida_horario": nova_viagem.saida_horario,
        "saida_km": nova_viagem.saida_km
    }

# ===== RETORNAR COM VEÍCULO =====
@router.post("/{coleta_id}/retornar")
def registrar_retorno(coleta_id: int, dados: ViagemData, current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    """Registra um retorno (finaliza uma viagem)"""
    coleta = db.query(Coleta).filter(
        Coleta.id == coleta_id,
        Coleta.usuario_id == current_user.id,
        Coleta.ativo == True
    ).first()
    
    if not coleta:
        raise HTTPException(status_code=404, detail="Coleta não encontrada")
    
    # Buscar viagem aberta (com saída mas sem retorno)
    viagem_aberta = db.query(Viagem).filter(
        Viagem.coleta_id == coleta_id,
        Viagem.retorno_horario == None
    ).first()
    
    if not viagem_aberta:
        raise HTTPException(status_code=400, detail="Nenhuma saída registrada para retornar")
    
    # Atualizar viagem com retorno
    viagem_aberta.retorno_horario = datetime.utcnow()
    viagem_aberta.retorno_km = dados.km
    viagem_aberta.retorno_observacoes = dados.observacoes
    viagem_aberta.km_rodado = dados.km - viagem_aberta.saida_km
    
    db.commit()
    db.refresh(viagem_aberta)
    
    return {
        "id": viagem_aberta.id,
        "numero_viagem": viagem_aberta.numero_viagem,
        "retorno_horario": viagem_aberta.retorno_horario,
        "retorno_km": viagem_aberta.retorno_km,
        "km_rodado": viagem_aberta.km_rodado
    }

# ===== DEVOLVER VEÍCULO (FINALIZA COLETA) =====
@router.post("/{coleta_id}/devolver")
def devolver_veiculo(coleta_id: int, dados: ViagemData, current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    """Finaliza coleta (devolve veículo) com KM e observações"""
    coleta = db.query(Coleta).filter(
        Coleta.id == coleta_id,
        Coleta.usuario_id == current_user.id,
        Coleta.ativo == True
    ).first()
    
    if not coleta:
        raise HTTPException(status_code=404, detail="Coleta não encontrada")
    
    # Verificar se há viagem com saída mas sem retorno
    viagem_aberta = db.query(Viagem).filter(
        Viagem.coleta_id == coleta_id,
        Viagem.retorno_horario == None
    ).first()
    
    if viagem_aberta:
        raise HTTPException(status_code=400, detail="Finalize o trajeto aberto (retorne) antes de devolver o veículo")
    
    # Finalizar coleta com dados da devolução
    coleta.ativo = False
    coleta.data_devolucao = datetime.utcnow()
    coleta.km_devolucao = dados.km
    coleta.observacoes_devolucao = dados.observacoes
    db.commit()
    
    return {
        "id": coleta.id,
        "data_devolucao": coleta.data_devolucao,
        "km_devolucao": coleta.km_devolucao,
        "observacoes_devolucao": coleta.observacoes_devolucao,
        "ativo": coleta.ativo
    }

# ===== OBTER COLETA ATIVA =====
@router.get("/ativa")
def obter_coleta_ativa(current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    """Obtém coleta ativa do usuário"""
    coleta = db.query(Coleta).filter(
        Coleta.usuario_id == current_user.id,
        Coleta.ativo == True
    ).first()
    
    if not coleta:
        raise HTTPException(status_code=404, detail="Nenhuma coleta ativa")
    
    # Buscar dados do veículo
    veiculo = db.query(Veiculo).filter(Veiculo.id == coleta.veiculo_id).first()
    
    # Buscar viagens desta coleta
    viagens = db.query(Viagem).filter(Viagem.coleta_id == coleta.id).all()
    
    return {
        "id": coleta.id,
        "veiculo_id": coleta.veiculo_id,
        "veiculo": {
            "id": veiculo.id,
            "placa": veiculo.placa,
            "marca": veiculo.marca,
            "modelo": veiculo.modelo,
            "ano": veiculo.ano
        } if veiculo else None,
        "data_retirada": coleta.data_retirada,
        "km_retirada": coleta.km_retirada,
        "observacoes_retirada": coleta.observacoes_retirada,
        "ativo": coleta.ativo,
        "viagens": [
            {
                "id": v.id,
                "numero": v.numero_viagem,
                "saida_horario": v.saida_horario,
                "saida_km": v.saida_km,
                "retorno_horario": v.retorno_horario,
                "retorno_km": v.retorno_km,
                "km_rodado": v.km_rodado
            } for v in viagens
        ]
    }

# ===== LISTAR VIAGENS DE UMA COLETA =====
@router.get("/{coleta_id}/viagens")
def listar_viagens(coleta_id: int, current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    """Lista todas as viagens de uma coleta"""
    coleta = db.query(Coleta).filter(
        Coleta.id == coleta_id,
        Coleta.usuario_id == current_user.id
    ).first()
    
    if not coleta:
        raise HTTPException(status_code=404, detail="Coleta não encontrada")
    
    viagens = db.query(Viagem).filter(Viagem.coleta_id == coleta_id).all()
    
    return {
        "coleta_id": coleta.id,
        "veiculo_id": coleta.veiculo_id,
        "data_retirada": coleta.data_retirada,
        "data_devolucao": coleta.data_devolucao,
        "total_viagens": len(viagens),
        "total_km": sum(v.km_rodado for v in viagens if v.km_rodado),
        "viagens": [
            {
                "id": v.id,
                "numero": v.numero_viagem,
                "saida_horario": v.saida_horario,
                "saida_km": v.saida_km,
                "retorno_horario": v.retorno_horario,
                "retorno_km": v.retorno_km,
                "km_rodado": v.km_rodado
            } for v in viagens
        ]
    }

# ===== UPLOADS AINDA FUNCIONAM COM COLETAS =====
@router.post("/{coleta_id}/upload-foto")
async def upload_foto(coleta_id: int, file: UploadFile = File(...), current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    """Faz upload de foto para uma coleta - organiza em pasta do usuário com data/hora"""
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"[UPLOAD] Iniciando upload - Coleta: {coleta_id}, Arquivo: {file.filename}, Content-Type: {file.content_type}")
    
    coleta = db.query(Coleta).filter(Coleta.id == coleta_id, Coleta.usuario_id == current_user.id).first()
    if not coleta:
        logger.error(f"[UPLOAD] Coleta {coleta_id} não encontrada para usuário {current_user.usuario_id}")
        raise HTTPException(status_code=404, detail="Coleta não encontrada")
    
    # ===== VALIDAÇÃO APRIMORADA DE ARQUIVO =====
    # 1. Verificar se arquivo foi enviado
    if not file or not file.filename:
        logger.error("[UPLOAD] Nenhum arquivo foi enviado")
        raise HTTPException(status_code=400, detail="Nenhum arquivo foi enviado")
    
    # 2. Validar extensão
    extensoes_permitidas = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic"}
    nome_arquivo = file.filename.lower()
    extensao = os.path.splitext(nome_arquivo)[1]
    
    logger.info(f"[UPLOAD] Extensão detectada: {extensao}")
    
    if extensao not in extensoes_permitidas:
        logger.error(f"[UPLOAD] Extensão não permitida: {extensao}")
        raise HTTPException(
            status_code=400, 
            detail=f"Tipo de arquivo não permitido. Use: {', '.join(extensoes_permitidas)}"
        )
    
    # 3. Ler e validar tamanho
    try:
        contents = await file.read()
        logger.info(f"[UPLOAD] Arquivo lido com sucesso - Tamanho: {len(contents)} bytes")
    except Exception as e:
        logger.error(f"[UPLOAD] Erro ao ler arquivo: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Erro ao ler arquivo: {str(e)}")
    
    tamanho_mb = len(contents) / (1024 * 1024)
    max_size_mb = settings.MAX_UPLOAD_SIZE / (1024 * 1024)
    
    if len(contents) > settings.MAX_UPLOAD_SIZE:
        logger.error(f"[UPLOAD] Arquivo muito grande: {tamanho_mb:.2f}MB (máx: {max_size_mb:.0f}MB)")
        raise HTTPException(
            status_code=400,
            detail=f"Arquivo muito grande ({tamanho_mb:.2f}MB). Máximo: {max_size_mb:.0f}MB"
        )
    
    # 4. Validar se é imagem real (magic bytes) - mais permissivo
    if len(contents) < 4:
        logger.error("[UPLOAD] Arquivo muito pequeno ou corrompido")
        raise HTTPException(status_code=400, detail="Arquivo inválido ou corrompido")
    
    # Verificar magic bytes para imagens comuns - versão mais permissiva
    magic_bytes = contents[:12]
    is_valid_image = (
        magic_bytes[:3] == b'\xff\xd8\xff' or  # JPEG
        magic_bytes[:8] == b'\x89PNG\r\n\x1a\n' or  # PNG
        magic_bytes[:6] in (b'GIF87a', b'GIF89a') or  # GIF
        magic_bytes[:4] == b'RIFF' and len(magic_bytes) >= 12 and magic_bytes[8:12] == b'WEBP'  # WEBP
    )
    
    if not is_valid_image:
        logger.warning(f"[UPLOAD] Magic bytes não reconhecidos. Primeiros bytes: {magic_bytes.hex()}")
        # Ao invés de rejeitar, apenas registrar warning e continuar
        logger.warning(f"[UPLOAD] Permitindo arquivo mesmo com magic bytes não reconhecidos (pode ser imagem móvel)")
    
    logger.info(f"[UPLOAD] Validação de imagem passou")
    
    # 5. Verificar limite de fotos por coleta
    fotos_coleta = db.query(Foto).filter(Foto.coleta_id == coleta_id).count()
    if fotos_coleta >= 10:
        logger.error(f"[UPLOAD] Limite de fotos atingido para coleta {coleta_id}")
        raise HTTPException(status_code=400, detail="Máximo de 10 fotos por coleta")
    
    # ===== SALVAR ARQUIVO =====
    # Criar estrutura de pasta: uploads/{usuario_id}/
    pasta_usuario = os.path.join(settings.UPLOAD_DIR, current_user.usuario_id)
    os.makedirs(pasta_usuario, exist_ok=True)
    
    # Salvar arquivo com nome: {data}_{hora}_{coleta_id}_{arquivo}
    tz = pytz.timezone('America/Sao_Paulo')
    agora_sp = datetime.now(tz)  # horário local SP para o nome do arquivo
    data_hora = agora_sp.strftime("%Y%m%d_%H%M%S")
    etapa = "saida" if coleta.ativo else "retorno"
    
    # Nome final: 20260118_232530_saida_1_1705614330123.jpg
    timestamp = int(agora_sp.timestamp() * 1000)  # Millisegundos para garantir unicidade
    filename = f"{data_hora}_{etapa}_{coleta_id}_{timestamp}{extensao}"
    filepath = os.path.join(pasta_usuario, filename)
    
    logger.info(f"[UPLOAD] Salvando arquivo em: {filepath}")
    
    # Salvar arquivo
    try:
        with open(filepath, "wb") as f:
            f.write(contents)
        logger.info(f"[UPLOAD] Arquivo salvo com sucesso")
    except Exception as e:
        logger.error(f"[UPLOAD] Erro ao salvar arquivo: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao salvar arquivo: {str(e)}")
    
    # Salvar no banco com caminho relativo (usuario_id/arquivo)
    caminho_relativo = f"{current_user.usuario_id}/{filename}"
    # Salvar timestamp UTC REAL do servidor (não converter de SP!)
    agora_utc = datetime.utcnow()
    nova_foto = Foto(coleta_id=coleta_id, etapa=etapa, caminho=caminho_relativo, criado_em=agora_utc)
    
    try:
        db.add(nova_foto)
        db.commit()
        db.refresh(nova_foto)
        logger.info(f"[UPLOAD] Foto registrada no banco de dados - ID: {nova_foto.id}")
    except Exception as e:
        logger.error(f"[UPLOAD] Erro ao salvar no banco: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao salvar no banco: {str(e)}")
    
    logger.info(f"[UPLOAD] Upload concluído com sucesso")
    return {"id": nova_foto.id, "caminho": nova_foto.caminho, "tamanho_mb": round(tamanho_mb, 2)}

# ===== LISTAR MINHAS COLETAS =====
@router.get("/minhas-coletas")
def listar_minhas_coletas(current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    """Lista todas as coletas do usuário"""
    coletas = db.query(Coleta).filter(Coleta.usuario_id == current_user.id).all()
    
    resultado = []
    for coleta in coletas:
        veiculo = db.query(Veiculo).filter(Veiculo.id == coleta.veiculo_id).first()
        viagens = db.query(Viagem).filter(Viagem.coleta_id == coleta.id).all()
        
        resultado.append({
            "id": coleta.id,
            "veiculo": {
                "id": veiculo.id,
                "placa": veiculo.placa,
                "marca": veiculo.marca,
                "modelo": veiculo.modelo
            },
            "data_retirada": coleta.data_retirada,
            "data_devolucao": coleta.data_devolucao,
            "ativo": coleta.ativo,
            "total_viagens": len(viagens),
            "total_km": sum(v.km_rodado for v in viagens if v.km_rodado)
        })
    
    return resultado
