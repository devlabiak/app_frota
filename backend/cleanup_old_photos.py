"""
"""Script para limpar fotos com mais de 90 dias
Execute periodicamente via cron ou task scheduler
"""

import os
import shutil
from datetime import datetime, timedelta
from app.database import SessionLocal
from app.modelos import Foto
from app.config import settings

def cleanup_old_photos():
    """Remove fotos antigas (> 90 dias) do servidor"""
    db = SessionLocal()
    
    try:
        # Data limite: 90 dias atrás
        data_limite = datetime.utcnow() - timedelta(days=90)
        
        # Buscar fotos antigas
        fotos_antigas = db.query(Foto).filter(Foto.criado_em < data_limite).all()
        
        if not fotos_antigas:
            print(f"[{datetime.utcnow()}] ✓ Nenhuma foto para deletar")
            return
        
        print(f"[{datetime.utcnow()}] 🗑️ Encontradas {len(fotos_antigas)} fotos para deletar")
        
        deletadas = 0
        erros = 0
        pastas_vazias = set()
        
        for foto in fotos_antigas:
            try:
                # Deletar arquivo
                filepath = os.path.join(settings.UPLOAD_DIR, foto.caminho)
                if os.path.exists(filepath):
                    os.remove(filepath)
                    print(f"  ✓ Deletado: {foto.caminho}")
                    
                    # Rastrear pasta para possível limpeza
                    pasta = os.path.dirname(filepath)
                    pastas_vazias.add(pasta)
                else:
                    print(f"  ⚠️ Arquivo não encontrado: {foto.caminho}")
                
                # Deletar do banco
                db.delete(foto)
                deletadas += 1
                
            except Exception as e:
                print(f"  ❌ Erro ao deletar {foto.caminho}: {e}")
                erros += 1
        
        # Remover pastas vazias
        for pasta in pastas_vazias:
            if os.path.exists(pasta):
                try:
                    if not os.listdir(pasta):  # Verificar se está vazia
                        os.rmdir(pasta)
                        print(f"  ✓ Pasta vazia removida: {os.path.basename(pasta)}")
                except Exception as e:
                    pass  # Pasta não está vazia, ignorar
        
        # Commit das deleções
        db.commit()
        
        print(f"[{datetime.utcnow()}] ✓ Limpeza concluída: {deletadas} fotos deletadas, {erros} erros")
        
    except Exception as e:
        print(f"[{datetime.utcnow()}] ❌ Erro na limpeza: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_old_photos()
