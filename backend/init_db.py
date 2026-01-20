from app.database import SessionLocal, Base, engine
from app.modelos import Usuario, Veiculo
from app.utils import hash_password

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

db = SessionLocal()

admin = Usuario(
    usuario_id='admin',
    nome='Administrador',
    senha_hash=hash_password('admin'),
    is_admin=True,
    ativo=True
)
db.add(admin)

veiculos = [
    Veiculo(placa='ABC-1234', modelo='Sprinter', marca='Mercedes', ano=2020),
    Veiculo(placa='XYZ-9876', modelo='Iveco', marca='Iveco', ano=2021),
    Veiculo(placa='DEF-5678', modelo='Scania', marca='Scania', ano=2019),
]
db.add_all(veiculos)

db.commit()
print('Banco resetado com sucesso!')
