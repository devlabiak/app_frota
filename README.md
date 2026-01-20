# App Frota DPL - Controle de Frota de Veículos

Sistema completo para gestão de frota com **rastreamento de KM**, **fotos de coleta/devolução** e **painel administrativo**.

## 🚀 Características

✅ **Autenticação JWT** segura com bcrypt  
✅ **Retirada/Devolução** de veículos com registro de KM e fotos (até 5 por operação)  
✅ **Rastreamento de KM** por veículo, motorista e período  
✅ **Painel Administrativo** - Usuários, Veículos, Relatórios e Fotos  
✅ **HTTPS/TLS** com Cloudflare Origin Certificate  
✅ **Rate Limiting** e headers de segurança (HSTS, X-Frame-Options)  
✅ **Auto-init** do banco de dados com usuário admin padrão  
✅ **Docker** + PostgreSQL - pronto para produção  

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

## 🐳 Deploy em Produção (VPS)

### Pré-requisitos
- VPS com Ubuntu/Debian
- Docker + Docker Compose
- Domínio configurado no Cloudflare

### Deploy Automático

1. **Clonar repositório no VPS**
```bash
git clone https://github.com/seu-usuario/app_frota.git
cd app_frota
```

2. **Executar script de deploy**
```bash
chmod +x DEPLOY_VPS.sh
./DEPLOY_VPS.sh
```

O script instala:
- Docker e Docker Compose
- Nginx com TLS (certificado Cloudflare Origin)
- PostgreSQL 15
- FastAPI com auto-init do banco

3. **Configuração Cloudflare**
- DNS: nuvem laranja (proxied)
- SSL/TLS: Full (Strict)
- Edge Certificates: "Always Use HTTPS" + "Automatic HTTPS Rewrites"

### Credenciais Padrão
- Usuário: `admin`
- Senha: `admin`
- **⚠️ ALTERE após primeiro login!**

### Comandos Úteis
```bash
# Status dos containers
docker compose ps

# Logs da API
docker compose logs api --tail 50

# Resetar senha do admin
docker compose exec api python reset_admin_password.py

# Rebuild após mudanças
docker compose down
docker compose up -d --build
```

## 📋 Funcionalidades

### Motoristas
- Login com usuario_id e senha
- Retirar veículo disponível com registro de KM e até 5 fotos
- Devolver veículo com KM final e fotos
- Histórico de coletas

### Administradores
- **Usuários**: Criar, listar, ativar/desativar motoristas e admins
- **Veículos**: CRUD completo de veículos
- **Relatórios**: Estatísticas de uso, KM por veículo/motorista/período
- **Fotos**: Visualizar fotos de coletas por motorista

## 🔐 Segurança

✅ Senha hash com bcrypt  
✅ JWT para autenticação  
✅ HTTPS/TLS com certificado Cloudflare  
✅ HSTS + headers de segurança  
✅ Rate limiting (60 req/min)  
✅ CORS configurado  
✅ PostgreSQL sem exposição de porta  

## 📊 Estrutura

```
app_frota/
├── backend/
│   ├── app/
│   │   ├── modelos/      # SQLAlchemy models
│   │   ├── esquemas/     # Pydantic schemas
│   │   ├── rotas/        # API endpoints
│   │   ├── database.py
│   │   ├── config.py
│   │   └── utils.py
│   ├── main.py
│   ├── init_db_prod.py   # Auto-init com retry
│   ├── reset_admin_password.py
│   ├── cleanup_old_photos.py
│   └── requirements.txt
├── frontend/
│   ├── index.html
│   ├── css/style.css
│   └── js/ (app.js, api.js)
├── uploads/              # Fotos de coletas
├── docker-compose.yml
├── Dockerfile
├── DEPLOY_VPS.sh
└── README.md
```

## 🔗 API Endpoints

### Auth
- `POST /api/auth/login` - Login

### Coleta
- `GET /api/coleta/veiculos` - Veículos disponíveis
- `POST /api/coleta/retirar/{veiculo_id}` - Retirar veículo
- `GET /api/coleta/ativa` - Coleta ativa
- `POST /api/coleta/{id}/devolver` - Devolver veículo
- `POST /api/coleta/{id}/upload-foto` - Upload foto

### Admin
- `GET/POST /api/admin/usuarios` - CRUD usuários
- `GET/POST /api/admin/veiculos` - CRUD veículos
- `GET /api/admin/relatorios` - Relatórios
- `GET /api/admin/fotos/{usuario_id}` - Fotos por motorista

## 🆘 Troubleshooting

**Containers não sobem:**
```bash
docker compose logs
docker compose down
docker volume rm app_frota_postgres_data
docker compose up -d --build
```

**Erro de autenticação PostgreSQL:**
```bash
# Verificar .env e docker-compose.yml (senha deve ser igual)
docker compose down
docker volume rm app_frota_postgres_data
docker compose up -d
```

**Nginx erro 502:**
```bash
docker compose ps  # Verificar se API está healthy
curl http://localhost:8000/health
docker compose logs api --tail 50
```

**Sem cadeado HTTPS:**
- Limpar cache do navegador (Ctrl+Shift+Delete)
- Verificar DNS Cloudflare com nuvem laranja (proxied)
- Ativar "Always Use HTTPS" no Cloudflare
- Testar em modo anônimo

**Upload de fotos falha:**
```bash
chmod 755 uploads
docker compose restart api
```

## 📄 Licença

MIT License - livre para uso comercial e pessoal.

---

**App Frota DPL** - Sistema de Gestão de Frota  
Desenvolvido com FastAPI + PostgreSQL + Docker
