# App Frota - Controle de Frota de Veículos

Aplicação completa para controle de frota de veículos com **tracking em 6 etapas**, **relatórios detalhados de KM** e **painel administrativo**.

## 🚀 Características

✅ **Login e Autenticação** com JWT (usuario_id + senha)  
✅ **Workflow de 6 Etapas** - Saída/Retorno em 3 ciclos por coleta  
✅ **Rastreamento de KM** por veículo, por usuário e por período (dia/semana/mês)  
✅ **Painel de Admin** com 3 abas: Usuários, Veículos, Relatórios  
✅ **CRUD Completo** de usuários e veículos com soft delete  
✅ **Relatórios Detalhados** mostrando uso de veículos e performance de motoristas  
✅ **Docker** - pronto para deploy em qualquer cloud  

## 📱 Funcionalidades

### Para Motoristas
- Login com usuario_id e senha
- Selecionar veículo disponível
- Registrar 6 etapas de coleta:
  - **Saída 1, 2, 3** - Registrar quilometragem ao sair com veículo
  - **Retorno 1, 2, 3** - Registrar quilometragem ao devolver veículo
  - Cada etapa permite: horário, quilometragem e observações
- Após Retorno (1, 2 ou 3), veículo fica disponível novamente para outro ciclo
- Histórico completo de coletas

### Para Administradores
- **Aba Usuários**: Criar, listar e gerenciar motoristas e admins
- **Aba Veículos**: Criar, listar e deletar veículos (soft delete)
- **Aba Relatórios**: 
  - Estatísticas gerais (total coletas, usuários, veículos)
  - Relatório por Veículo (KM hoje, semana, mês, total)
  - Relatório por Usuário (KM total, coletas, detalhamento de etapas)

## 🏗️ Arquitetura

```
Frontend (HTML5 + JavaScript)
    ↓
IndexedDB (Cache offline)
    ↓
Service Workers (Funciona offline)
    ↓
FastAPI Backend (Python)
    ↓
SQLite/PostgreSQL (Banco de dados)
```

## 🔧 Instalação Local

### Pré-requisitos
- Python 3.11+
- Docker (para deploy)
- Node.js (opcional, para dev)

### Desenvolvimento Local

1. **Clonar o projeto**
```bash
cd App_Frota
```

2. **Criar ambiente virtual**
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate  # Windows
```

3. **Instalar dependências**
```bash
pip install -r backend/requirements.txt
```

4. **Rodar servidor**
```bash
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

5. **Acessar**
- Frontend: http://localhost:8000
- API Docs: http://localhost:8000/docs

## 🐳 Deploy com Docker (Easypanel/Hostinger)

### 1. Preparação Local

```bash
# Build da imagem
docker build -f Dockerfile.prod -t app-frota:latest .

# Testar localmente
docker run -p 8000:8000 -e DATABASE_URL=sqlite:///./frota.db app-frota:latest
```

### 2. Deploy no Easypanel

1. **Acessar Easypanel** na sua VPS Hostinger
2. **Criar novo Container**:
   - Nome: `app-frota`
   - Imagem: `seu-usuario/app-frota:latest` (se estiver no Docker Hub)
   - Porta: `8000`
   - Variáveis de Ambiente:
     ```
     DATABASE_URL=sqlite:///./frota.db
     SECRET_KEY=sua-chave-secreta-muito-segura
     ```

3. **Configurar Volume**:
   - `/uploads` → `/data/app-frota/uploads`

4. **Configurar Domínio**:
   - Apontar seu domínio para a VPS
   - Easypanel gerará HTTPS automaticamente

### 3. Com docker-compose

Se preferir usar docker-compose:

```bash
docker-compose up -d
```

## 📝 Primeiro Acesso

1. **Criar usuário admin** (execute no terminal do container):
```bash
python -c "
from app.database import SessionLocal, Base, engine
from app.modelos import Usuario
from app.utils import hash_password

Base.metadata.create_all(bind=engine)
db = SessionLocal()
admin = Usuario(
    nome='Administrador',
    email='admin@example.com',
    senha_hash=hash_password('123456'),
    is_admin=True,
    ativo=True
)
db.add(admin)
db.commit()
print('Admin criado: admin@example.com / 123456')
"
```

2. **Acessar aplicação**:
   - URL: `http://seu-dominio.com`
   - Email: `admin@example.com`
   - Senha: `123456` (MUDE DEPOIS!)

## 🧪 Teste Rápido

### Credenciais de Teste
```
Admin:
  usuario_id: admin
  senha: 123456

Motorista:
  usuario_id: MOTO001
  senha: 123456
```

### Veículos de Teste
- ABC-1234 (Mercedes Sprinter 2020)
- XYZ-9876 (Iveco Daily 2021)
- DEF-5678 (Scania R 2019)

### Fluxo de Teste

1. **Login como Motorista MOTO001**
2. **Selecionar veículo** (ex: ABC-1234)
3. **Registrar as 6 etapas**:
   - Saída 1: Registre KM
   - Retorno 1: Registre KM
   - Saída 2: Registre KM
   - Retorno 2: Registre KM
   - Saída 3: Registre KM
   - Retorno 3: Registre KM
4. **Login como Admin**
5. **Acessar aba Relatórios**
6. **Visualizar dados de KM** por veículo e por usuário

## 📊 Estrutura de Dados

### Coleta (6 Etapas)
```json
{
  "id": 1,
  "usuario_id": 1,
  "veiculo_id": 1,
  "saida_1": {"horario": "2024-01-19T08:00:00", "km": 100, "observacoes": "..."},
  "retorno_1": {"horario": "2024-01-19T10:00:00", "km": 120, "observacoes": "..."},
  "saida_2": {"horario": "2024-01-19T11:00:00", "km": 120, "observacoes": "..."},
  "retorno_2": {"horario": "2024-01-19T13:00:00", "km": 145, "observacoes": "..."},
  "saida_3": {"horario": "2024-01-19T14:00:00", "km": 145, "observacoes": "..."},
  "retorno_3": {"horario": "2024-01-19T16:00:00", "km": 170, "observacoes": "..."}
}
```

### Veículo Disponível
Um veículo só fica **indisponível** enquanto há uma coleta **ativa** (Saída registrado sem Retorno correspondente).

Após qualquer **Retorno**, o veículo volta a ficar disponível.

## 🔐 Segurança

- [ ] **Importante**: Alterar `SECRET_KEY` em `.env`
- [ ] Usar HTTPS em produção
- [ ] Trocar senha do admin padrão
- [ ] Configurar backup de banco de dados
- [ ] Usar PostgreSQL em produção (não SQLite)

## 📊 Estrutura de Pastas

```
App_Frota/
├── backend/
│   ├── app/
│   │   ├── modelos/
│   │   │   ├── usuario.py
│   │   │   └── coleta.py
│   │   ├── esquemas/
│   │   │   ├── usuario.py
│   │   │   └── coleta.py
│   │   ├── rotas/
│   │   │   ├── auth.py
│   │   │   ├── admin.py
│   │   │   └── coleta.py
│   │   ├── database.py
│   │   ├── config.py
│   │   └── utils.py
│   ├── main.py
│   └── requirements.txt
├── frontend/
│   ├── index.html
│   ├── manifest.json
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── app.js
│       ├── api.js
│       ├── db.js
│       ├── sync.js
│       └── sw.js
├── uploads/
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## 🔗 Endpoints da API

### Autenticação
- `POST /api/auth/login` - Fazer login
- `POST /api/auth/verificar-token` - Verificar token

### Coleta de Dados
- `POST /api/coleta/criar` - Criar nova coleta
- `POST /api/coleta/upload-foto/{coleta_id}` - Upload de foto
- `GET /api/coleta/minhas-coletas` - Listar minhas coletas

### Admin
- `POST /api/admin/usuarios` - Criar usuário
- `GET /api/admin/usuarios` - Listar usuários
- `GET /api/admin/relatorios` - Gerar relatório

## 🆘 Troubleshooting

### Erro de conexão com banco de dados
```bash
# Verificar arquivo .env
# DATABASE_URL deve estar correto
```

### Upload de fotos falha
```bash
# Verificar permissões da pasta uploads
chmod 755 uploads
```

### App não sincroniza offline
```bash
# Verificar se Service Worker está registrado
# Verificar console do navegador para erros
```

## 📱 Para Android

1. **Instalar como Progressive Web App**:
   - Abrir em Chrome/Firefox
   - Menu → Instalar / Adicionar à tela inicial
   - Funcionará como app nativo

2. **Usar WebView nativa** (opcional):
   - Criar app Android nativo que carrega a URL em WebView

## 📞 Suporte

Para dúvidas ou problemas, revisar:
- Logs: `docker logs app-frota`
- API Docs: `http://seu-dominio/docs`
- Console do navegador (F12)

## 📄 Licença

MIT License - Livre para usar e modificar
