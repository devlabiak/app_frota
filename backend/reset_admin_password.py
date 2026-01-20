"""
Script para resetar a senha do usuário admin
Execute quando precisar redefinir a senha do administrador
"""
import sys
from app.database import SessionLocal
from app.modelos import Usuario
from app.utils import hash_password

def reset_admin_password(new_password='admin'):
    """Reseta a senha do admin para a padrão (admin)"""
    db = SessionLocal()
    
    try:
        # Buscar usuário admin
        admin = db.query(Usuario).filter(Usuario.usuario_id == 'admin').first()
        
        if not admin:
            print("❌ Usuário admin não encontrado")
            return False
        
        # Atualizar senha
        admin.senha_hash = hash_password(new_password)
        db.commit()
        
        print(f"✓ Senha do admin foi resetada para: {new_password}")
        return True
        
    except Exception as e:
        print(f"❌ Erro ao resetar senha: {str(e)}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    # Se passar parâmetro, usa como nova senha. Senão usa 'admin'
    nova_senha = sys.argv[1] if len(sys.argv) > 1 else 'admin'
    reset_admin_password(nova_senha)
