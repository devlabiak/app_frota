"""
Script para inicializar o banco de dados com dados padrão
Execute após o primeiro deploy para criar usuário admin e veículos de teste
"""
import time
from app.database import SessionLocal, Base, engine
from app.modelos import Usuario, Veiculo
from app.utils import hash_password
from sqlalchemy.exc import OperationalError
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def wait_for_db(max_retries=30):
    """Aguarda o banco de dados ficar disponível"""
    retries = 0
    while retries < max_retries:
        try:
            # Tenta criar uma sessão
            db = SessionLocal()
            db.execute(text("SELECT 1"))
            db.close()
            logger.info("✓ Banco de dados disponível")
            return True
        except OperationalError:
            retries += 1
            logger.info(f"Aguardando banco de dados... ({retries}/{max_retries})")
            time.sleep(2)
    
    logger.error("❌ Não foi possível conectar ao banco de dados")
    return False

def init_db():
    """Inicializa o banco com dados padrão"""
    logger.info("Iniciando criação de tabelas...")
    
    # Aguardar banco ficar disponível
    if not wait_for_db():
        return
    
    # Criar tabelas
    Base.metadata.create_all(bind=engine)
    logger.info("✓ Tabelas criadas")
    
    db = SessionLocal()
    
    try:
        # Verificar se já existe admin
        admin_existente = db.query(Usuario).filter(Usuario.usuario_id == 'admin').first()
        
        if not admin_existente:
            logger.info("Criando usuário admin...")
            admin = Usuario(
                usuario_id='admin',
                nome='Administrador',
                senha_hash=hash_password('admin'),
                is_admin=True,
                ativo=True
            )
            db.add(admin)
            logger.info("✓ Usuário admin criado (usuario: admin, senha: admin)")
            logger.warning("⚠️ IMPORTANTE: Altere a senha do admin após o primeiro login!")
        else:
            logger.info("Usuário admin já existe")
        
        # Verificar se já existem veículos
        veiculos_existentes = db.query(Veiculo).count()
        
        if veiculos_existentes == 0:
            logger.info("Criando veículos de exemplo...")
            veiculos = [
                Veiculo(placa='ABC-1234', modelo='Sprinter', marca='Mercedes', ano=2020),
                Veiculo(placa='XYZ-9876', modelo='Iveco', marca='Iveco', ano=2021),
                Veiculo(placa='DEF-5678', modelo='Scania', marca='Scania', ano=2019),
            ]
            db.add_all(veiculos)
            logger.info(f"✓ {len(veiculos)} veículos criados")
        else:
            logger.info(f"Já existem {veiculos_existentes} veículos cadastrados")
        
        db.commit()
        logger.info("✓ Banco de dados inicializado com sucesso!")
        
    except Exception as e:
        logger.error(f"❌ Erro ao inicializar banco: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
