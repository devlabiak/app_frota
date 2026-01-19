#!/usr/bin/env python3
"""Script para inicializar dados no banco via SQL"""

import sqlite3
import os
from pathlib import Path

# Procurar o banco de dados
db_path = Path("/app/frota.db") if os.path.exists("/app/frota.db") else Path("./backend/frota.db")

if not db_path.exists():
    print(f"Banco não encontrado em {db_path}")
    print("Procurando em containers...")
    os.system("docker exec app-frota-api python -c \"from app.utils import hash_password; from app.database import SessionLocal; from app.modelos import Usuario; db = SessionLocal(); admin = Usuario(usuario_id='admin', nome='Administrador', senha_hash=hash_password('123456'), is_admin=True, ativo=True); db.add(admin); db.commit(); print('Admin criado')\"")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Criar admin
    try:
        cursor.execute("""
            INSERT INTO usuario (usuario_id, nome, senha_hash, is_admin, ativo)
            VALUES (?, ?, ?, ?, ?)
        """, ("admin", "Administrador", "$2b$12$1VVZ1.5VVZ1.5VVZ1.5VVZ1.5VVZ1.5VVZ1.5VVZ1.5VVZ1.5VVZ1", True, True))
        conn.commit()
        print("✓ Admin criado")
    except Exception as e:
        print(f"Admin: {e}")
    
    conn.close()
