# 🚀 Deploy - App Frota

## 📋 Alterações Implementadas

### ✅ Segurança
- ✅ SECRET_KEY forte e aleatória gerada
- ✅ PostgreSQL configurado para produção
- ✅ CORS ajustado para acesso móvel (4G/5G) com segurança JWT
- ✅ Rate limiting implementado (60 req/min por IP)
- ✅ Validação robusta de uploads (tipo, tamanho, magic bytes)

### ✅ Infraestrutura
- ✅ PostgreSQL habilitado no docker-compose.yml
- ✅ Healthcheck usando curl
- ✅ Variáveis de ambiente organizadas
- ✅ Logging estruturado implementado

### ✅ Melhorias
- ✅ Database paths relativos (não mais hardcoded)
- ✅ Pool de conexões PostgreSQL otimizado
- ✅ Middleware de logging de requisições
- ✅ Eventos de startup/shutdown

---

## 🐳 Build e Teste Local

### 1. Teste com PostgreSQL (Produção)

```bash
# Build e iniciar containers
docker-compose up --build

# Em outro terminal, inicializar banco
docker exec -it app-frota-api python init_db_prod.py

# Acessar aplicação
# Frontend: http://localhost:8000
# API Docs: http://localhost:8000/docs
# Login: admin / admin
```

### 2. Teste com SQLite (Desenvolvimento)

```bash
# Usar compose para desenvolvimento
docker-compose -f docker-compose.dev.yml up --build

# Inicializar banco
docker exec -it app-frota-api-dev python init_db.py
```

---

## 📊 Verificar Logs

```bash
# Logs do container
docker logs -f app-frota-api

# Logs do PostgreSQL
docker logs -f app-frota-db
```

---

## 🔧 Variáveis de Ambiente (.env)

```env
# Produção
DATABASE_URL=postgresql://frota_user:senha_super_segura_mude_aqui@db:5432/frota_db
SECRET_KEY=_uvlaPZAtgJrJluydAO_umOm0sdk1FHCA_27cgDixY3tc2hW6T3PHesxU4482ePtP41ZTizZYxWy0ncHHFTRFA
ENVIRONMENT=production
DEBUG=False
RATE_LIMIT_ENABLED=True
LOG_LEVEL=INFO
```

---

## 🚨 IMPORTANTE - Antes de Subir na VPS

1. ⚠️ **Trocar senha do PostgreSQL** no docker-compose.yml e .env
2. ⚠️ **Alterar senha do admin** após primeiro login
3. ⚠️ **Verificar SECRET_KEY** está configurada
4. ⚠️ **Fazer backup** do código antes do deploy
5. ⚠️ **Configurar domínio/IP** no proxy reverso (Nginx/Caddy)

---

## 📝 Comandos Úteis

```bash
# Parar containers
docker-compose down

# Remover volumes (CUIDADO: deleta banco!)
docker-compose down -v

# Rebuild forçado
docker-compose up --build --force-recreate

# Ver status dos containers
docker ps

# Entrar no container
docker exec -it app-frota-api bash

# Backup do banco PostgreSQL
docker exec app-frota-db pg_dump -U frota_user frota_db > backup.sql

# Restaurar backup
docker exec -i app-frota-db psql -U frota_user frota_db < backup.sql
```

---

## 🌐 Deploy na VPS

### Opção 1: Docker Compose Direto

```bash
# Na VPS
git clone <seu-repo>
cd App_Frota

# Editar .env com valores reais
nano .env

# Subir aplicação
docker-compose up -d

# Inicializar banco
docker exec -it app-frota-api python init_db_prod.py
```

### Opção 2: Easypanel

1. Fazer push do código para GitHub
2. Conectar repositório no Easypanel
3. Configurar variáveis de ambiente
4. Deploy automático

---

## 🧪 Testar Endpoints

```bash
# Health check
curl http://localhost:8000/health

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usuario_id":"admin","senha":"admin"}'

# Listar veículos (precisa do token)
curl http://localhost:8000/api/coleta/veiculos \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

---

## ✅ Checklist Final

- [ ] SECRET_KEY alterada
- [ ] Senha PostgreSQL alterada
- [ ] Senha admin alterada
- [ ] Logs funcionando
- [ ] Health check OK
- [ ] Login funcionando
- [ ] Upload de fotos funcionando
- [ ] Rate limiting ativo
- [ ] Backup configurado
- [ ] Domínio/SSL configurado (se aplicável)
