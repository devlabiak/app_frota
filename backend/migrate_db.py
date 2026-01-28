"""
Script para aplicar migrações do banco de dados
Execute antes do init_db_prod.py para garantir que todas as colunas existem
"""
import time
from app.database import SessionLocal, engine
from sqlalchemy import text, inspect
from sqlalchemy.exc import OperationalError
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def wait_for_db(max_retries=30):
    """Aguarda o banco de dados ficar disponível"""
    retries = 0
    while retries < max_retries:
        try:
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

def column_exists(table_name, column_name):
    """Verifica se uma coluna existe em uma tabela"""
    inspector = inspect(engine)
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns

def add_column_if_not_exists(table_name, column_name, column_type):
    """Adiciona uma coluna se ela não existir"""
    if column_exists(table_name, column_name):
        logger.info(f"✓ Coluna {table_name}.{column_name} já existe")
        return
    
    db = SessionLocal()
    try:
        logger.info(f"Adicionando coluna {table_name}.{column_name}...")
        if column_type == "FLOAT":
            sql = f"ALTER TABLE {table_name} ADD COLUMN {column_name} FLOAT DEFAULT 0"
        elif column_type == "VARCHAR":
            sql = f"ALTER TABLE {table_name} ADD COLUMN {column_name} VARCHAR(255)"
        elif column_type == "INTEGER":
            sql = f"ALTER TABLE {table_name} ADD COLUMN {column_name} INTEGER DEFAULT 0"
        else:
            sql = f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"
        
        db.execute(text(sql))
        db.commit()
        logger.info(f"✓ Coluna {table_name}.{column_name} adicionada com sucesso!")
    except Exception as e:
        logger.error(f"❌ Erro ao adicionar coluna {table_name}.{column_name}: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def migrate_db():
    """Aplica todas as migrações necessárias"""
    logger.info("Iniciando migrações do banco de dados...")
    
    # Aguardar banco ficar disponível
    if not wait_for_db():
        return False
    
    try:
        # Migração 1: Adicionar coluna km_atual na tabela veiculos
        add_column_if_not_exists("veiculos", "km_atual", "FLOAT")
        
        logger.info("✓ Todas as migrações aplicadas com sucesso!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Erro ao aplicar migrações: {e}")
        return False

if __name__ == "__main__":
    migrate_db()
