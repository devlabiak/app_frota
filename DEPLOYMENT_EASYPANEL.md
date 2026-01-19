# Guia de Deploy - App Frota na Hostinger com EasyPanel

## 📋 Pré-requisitos
- Conta Hostinger com Docker habilitado
- EasyPanel instalado no servidor
- Git instalado no servidor
- Chave SSH configurada (recomendado)

---

## 🚀 Passo 1: Preparar a Aplicação para Produção

### 1.1 Atualizar o `docker-compose.yml` para Produção

Edite `docker-compose.yml` e faça as seguintes mudanças:

```yaml
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: app-frota-api
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://usuario:senha@db:5432/frota
      - SECRET_KEY=sua-chave-secreta-muito-segura-mude-em-producao
      - ENVIRONMENT=production
    volumes:
      - ./uploads:/app/uploads
      - ./backend:/app/backend
      - ./frontend:/app/frontend
    restart: always
    depends_on:
      - db
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: postgres:15-alpine
    container_name: app-frota-db
    environment:
      - POSTGRES_DB=frota
      - POSTGRES_USER=usuario_frota
      - POSTGRES_PASSWORD=sua-senha-super-segura
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always
    networks:
      - app-network

volumes:
  postgres_data:

networks:
  app-network:
    driver: bridge
```

### 1.2 Criar arquivo `.env` para Produção

```bash
DATABASE_URL=postgresql://usuario_frota:sua-senha-super-segura@db:5432/frota
SECRET_KEY=gere-uma-chave-secreta-aleatoria-muito-longa-aqui
ENVIRONMENT=production
DEBUG=false
```

### 1.3 Atualizar Dockerfile se necessário

Seu `Dockerfile` atual deve estar correto, mas garanta que tem:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .
COPY frontend/ ./frontend

RUN mkdir -p uploads

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 📦 Passo 2: Fazer Upload para Hostinger

### Opção A: Via Git (Recomendado)

1. **Criar repositório GitHub/GitLab:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit for production"
   git remote add origin https://github.com/seu-usuario/app-frota.git
   git push -u origin main
   ```

2. **No servidor Hostinger:**
   ```bash
   cd /home/seu-usuario/app-frota
   git clone https://github.com/seu-usuario/app-frota.git .
   ```

### Opção B: Via FTP/SFTP

1. Compactar o projeto:
   ```bash
   zip -r app-frota.zip . -x "uploads/*" "data/*" "*.git*" "__pycache__/*" ".env"
   ```

2. Fazer upload via FTP para `/home/seu-usuario/app-frota/`

3. Extrair no servidor:
   ```bash
   unzip app-frota.zip
   rm app-frota.zip
   ```

---

## ⚙️ Passo 3: Configurar no EasyPanel

### 3.1 Acessar EasyPanel

1. Acesse `https://seu-servidor:3000` ou o endereço do EasyPanel
2. Faça login com as credenciais

### 3.2 Criar Novo Projeto Docker

1. Clique em **"New Project"**
2. Selecione **"Docker Compose"**
3. Preencha os dados:
   - **Name:** `app-frota`
   - **Root Path:** `/home/seu-usuario/app-frota`
   - **Compose File:** `docker-compose.yml`

### 3.3 Configurar Variáveis de Ambiente

1. Clique em **"Environment"**
2. Adicione as variáveis do `.env`:
   ```
   DATABASE_URL=postgresql://usuario_frota:sua-senha-super-segura@db:5432/frota
   SECRET_KEY=sua-chave-aleatoria-muito-longa
   ```

### 3.4 Configurar Volumes

EasyPanel deve detectar automaticamente, mas verifique:
- `/app/uploads` → `/home/seu-usuario/app-frota/uploads`
- `/app/backend` → `/home/seu-usuario/app-frota/backend`
- `/app/frontend` → `/home/seu-usuario/app-frota/frontend`
- `postgres_data` → `/home/seu-usuario/app-frota/data/postgres`

### 3.5 Deploy

1. Clique em **"Deploy"** ou **"Start"**
2. Aguarde a construção e inicialização dos containers

---

## 🌐 Passo 4: Configurar Domínio e SSL (Reverse Proxy)

### 4.1 Adicionar Reverse Proxy no EasyPanel

1. Vá até **Proxy** ou **Reverse Proxy**
2. Clique em **"New Proxy"**
3. Configure:
   - **Domain:** `seu-dominio.com`
   - **Target:** `http://localhost:8000`
   - **Port:** `8000`
   - **Enable SSL:** ✓ (Let's Encrypt automático)

### 4.2 Apontar DNS

Na Hostinger:
1. Vá até **DNS** → **Registros DNS**
2. Altere o registro A para o IP do servidor
3. Aguarde propagação (até 24h)

---

## 🔧 Passo 5: Inicializar Banco de Dados

Após o deploy estar online, execute:

```bash
docker exec app-frota-api python init_db.py
```

Ou via SSH direto:

```bash
ssh seu-usuario@seu-servidor-ip
cd /home/seu-usuario/app-frota
docker-compose exec api python init_db.py
```

---

## 📋 Passo 6: Verificações Finais

```bash
# Ver status dos containers
docker ps

# Ver logs
docker-compose logs -f api
docker-compose logs -f db

# Testar conexão com banco
docker exec app-frota-api psql postgresql://usuario_frota:senha@db:5432/frota -c "SELECT 1"

# Testar API
curl http://localhost:8000/
```

---

## 🔐 Segurança em Produção

### 1. Mudar Senhas Padrão

```bash
# SSH no servidor e editar .env
nano /home/seu-usuario/app-frota/.env
```

**Variáveis importantes:**
- `POSTGRES_PASSWORD` - Senha do PostgreSQL
- `SECRET_KEY` - Chave para JWT tokens
- `DATABASE_URL` - URL completa do banco

### 2. Habilitar Firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 3. Backup do Banco de Dados

```bash
# Backup diário
0 2 * * * docker exec app-frota-db pg_dump -U usuario_frota frota > /backups/frota-$(date +\%Y\%m\%d).sql
```

### 4. Logs e Monitoramento

- Use `docker logs` para monitorar erros
- Configure alertas no EasyPanel
- Mantenha backups regularmente

---

## 🐛 Troubleshooting

### Erro: "Cannot connect to database"

```bash
# Verifique se o container DB está rodando
docker ps

# Veja os logs
docker-compose logs db
```

### Erro: "Port already in use"

```bash
# Mude a porta no docker-compose.yml
ports:
  - "8001:8000"  # 8001 é a porta externa
```

### Erro: "Permission denied"

```bash
# Corrija permissões
sudo chown -R seu-usuario:seu-usuario /home/seu-usuario/app-frota
chmod -R 755 /home/seu-usuario/app-frota
```

### Aplicação lenta ou não responde

```bash
# Aumente recursos
# No EasyPanel → Project Settings → Resources
# Ou edite docker-compose.yml:
services:
  api:
    # ...
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

---

## 📞 Suporte

- **EasyPanel Docs:** https://docs.easypanel.io
- **Docker Docs:** https://docs.docker.com
- **FastAPI Docs:** https://fastapi.tiangolo.com/deployment/
- **PostgreSQL Docs:** https://www.postgresql.org/docs/

---

## ✅ Checklist Final

- [ ] Repositório Git criado e configurado
- [ ] `.env` com senhas seguras
- [ ] `docker-compose.yml` otimizado para produção
- [ ] Projeto criado no EasyPanel
- [ ] Variáveis de ambiente configuradas
- [ ] Volumes mapeados corretamente
- [ ] Deploy executado com sucesso
- [ ] Domínio apontado e SSL configurado
- [ ] `init_db.py` executado
- [ ] Banco de dados inicializado
- [ ] API respondendo em `https://seu-dominio.com`
- [ ] Primeiro usuário admin criado
- [ ] Backups configurados
- [ ] Logs sendo monitorados

---

**Deploy concluído com sucesso! 🎉**
