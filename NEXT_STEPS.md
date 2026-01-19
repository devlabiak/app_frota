# 🎯 PRÓXIMAS AÇÕES - App Frota VPS Deployment

## 📋 Status Atual

✅ **Aplicação está 100% pronta para subir em VPS**

Todos os arquivos necessários foram preparados e estão no repositório GitHub:
- https://github.com/devlabiak/app_frota

---

## 🚀 Como Fazer o Deploy (3 Opções)

### OPÇÃO 1: Automática com Script (RECOMENDADO)
```bash
ssh usuario@seu_vps_ip
cd ~
wget https://raw.githubusercontent.com/devlabiak/app_frota/main/DEPLOY_VPS.sh
chmod +x DEPLOY_VPS.sh
./DEPLOY_VPS.sh
```
**Tempo**: ~5-10 minutos  
**Complica**: Não, tudo automático

---

### OPÇÃO 2: Passo a Passo Manual
1. Seguir [DEPLOY_INSTRUCTIONS.md](DEPLOY_INSTRUCTIONS.md)
2. Clonar repositório
3. Configurar .env
4. Executar `docker compose up -d`
5. Configurar Nginx

**Tempo**: ~30 minutos  
**Complica**: Meio complexo, mas bem documentado

---

### OPÇÃO 3: EasyPanel/CPanel (Se disponível no VPS)
Ver [DEPLOYMENT_EASYPANEL.md](DEPLOYMENT_EASYPANEL.md)

---

## 📋 Checklist Rápido Pré-Deploy

Antes de começar no VPS, prepare:

### ✅ No VPS
- [ ] Conectar via SSH
- [ ] Docker instalado: `docker --version`
- [ ] Git instalado: `git --version`
- [ ] Espaço em disco: `df -h` (mín 10GB)
- [ ] Memória: `free -h` (mín 2GB)
- [ ] Portas abertas: 22 (SSH), 80 (HTTP), 443 (HTTPS)

### ✅ Na Cloudflare
- [ ] Dashboard → Seu domínio
- [ ] SSL/TLS → Overview
- [ ] Status = **Full** (não Full Strict)
- [ ] DNS → `frotadpl.wlsolucoes.eti.br` apontando para IP com proxy ativo

### ✅ Informações à Mão
- [ ] IP do VPS
- [ ] Senha SSH/chave
- [ ] Nova senha para PostgreSQL (segura!)
- [ ] Email para logs (opcional)

---

## 🎬 Passo 1: Executar Deployment

**Se usar o script automático:**

```bash
# Conectar ao VPS
ssh usuario@seu_vps_ip

# Baixar e executar script
cd ~
wget https://raw.githubusercontent.com/devlabiak/app_frota/main/DEPLOY_VPS.sh
chmod +x DEPLOY_VPS.sh
./DEPLOY_VPS.sh
```

O script vai:
1. ✅ Limpar containers antigos
2. ✅ Clonar repositório
3. ✅ Configurar variáveis
4. ✅ Instalar Docker Compose plugin
5. ✅ Subir containers (API + Database)
6. ✅ Inicializar banco de dados
7. ✅ Instalar Nginx
8. ✅ Gerar certificados
9. ✅ Executar health checks

---

## ⚙️ Passo 2: Configurar Senha do Banco

Durante o script, ele pedirá para editar `.env`:

```bash
nano ~/app_frota/.env
```

**IMPORTANTE**: Mude a senha em 2 lugares:

1. **No .env**:
```
DATABASE_URL=postgresql://frota_user:SENHA_NOVA_AQUI@db:5432/frota_db
```

2. **No docker-compose.yml**:
```bash
nano ~/app_frota/docker-compose.yml
# Encontre a seção 'db' e mude:
POSTGRES_PASSWORD=SENHA_NOVA_AQUI  # MESMA senha do .env!
```

3. **Reiniciar containers**:
```bash
cd ~/app_frota
docker compose down
docker compose up -d
```

---

## ✅ Passo 3: Verificar Deployment

### Containers rodando?
```bash
docker compose ps
```

**Esperado**:
```
NAME                 STATUS          PORTS
app-frota-db         Up (healthy)    5432/tcp
app-frota-api        Up (healthy)    8000/tcp
traefik             Up              0.0.0.0:80->80/tcp
```

### API respondendo?
```bash
curl http://localhost:8000/health
```

**Esperado**:
```json
{"status": "ok"}
```

### HTTPS funcionando?
```bash
curl -k https://frotadpl.wlsolucoes.eti.br/health
```

---

## 🌐 Passo 4: Acessar a Aplicação

1. Abra no navegador:
   ```
   https://frotadpl.wlsolucoes.eti.br
   ```

2. Login padrão:
   - **Usuário**: `admin`
   - **Senha**: `admin`

3. **IMPORTANTE**: Mude a senha de admin após primeira login!
   - Clique no ícone de perfil (canto superior)
   - "Alterar Senha"

---

## 🔐 Passo 5: Segurança Essencial

### 1. Firewall
```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 2. Mudar senha do admin
- Acessar app
- Menu → Perfil
- Alterar Senha

### 3. Verificar logs
```bash
# Logs da aplicação
docker compose logs -f api

# Logs do banco
docker compose logs -f db

# Logs do Nginx
sudo tail -f /var/log/nginx/app_frota_error.log
```

---

## 📊 Monitoramento Contínuo

### Ver status em tempo real
```bash
# Terminal 1
docker stats

# Terminal 2
docker compose logs -f

# Terminal 3
sudo tail -f /var/log/nginx/app_frota_access.log
```

### Fazer backup do banco
```bash
docker exec app-frota-db pg_dump -U frota_user frota_db > ~/backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## 🆘 Se Algo Deu Errado

### Error: "Connection refused"
```bash
docker compose logs api
docker compose restart api
```

### Error: "Bad Gateway"
```bash
# Testar API localmente
curl http://localhost:8000/health

# Se falhar, reiniciar
docker compose restart api
```

### Error: Banco não conecta
```bash
# Verificar credenciais
cat ~/app_frota/.env | grep DATABASE_URL
cat ~/app_frota/docker-compose.yml | grep POSTGRES_PASSWORD

# Devem ser IDÊNTICAS!
```

### Error: Nginx não inicia
```bash
sudo nginx -t  # Verificar config
sudo journalctl -u nginx -n 50  # Ver logs
```

---

## 📁 Arquivos Importantes

| Arquivo | Propósito |
|---------|-----------|
| [DEPLOY_VPS.sh](DEPLOY_VPS.sh) | Script automático de instalação |
| [DEPLOY_INSTRUCTIONS.md](DEPLOY_INSTRUCTIONS.md) | Guia detalhado passo-a-passo |
| [DEPLOYMENT_STATUS.md](DEPLOYMENT_STATUS.md) | Status e checklist de preparação |
| [docker-compose.yml](docker-compose.yml) | Orquestração de containers |
| [.env](backend/.env) | Variáveis de produção (git-ignored) |
| [backend/main.py](backend/main.py) | FastAPI app com logging |
| [backend/requirements.txt](backend/requirements.txt) | Dependências Python |

---

## 🎯 Resumo da Arquitetura

```
Cliente (https://frotadpl.wlsolucoes.eti.br)
           ↓
    Cloudflare (SSL/TLS em Full Mode)
           ↓
  VPS Host Nginx (Port 80/443)
           ↓
 FastAPI em localhost:8000
           ↓
 PostgreSQL Database
```

---

## 📞 Informações Úteis

### Credenciais Padrão (MUDAR APÓS DEPLOY)
```
App:
  Usuário: admin
  Senha: admin ← MUDE APÓS LOGIN!

Banco:
  Usuário: frota_user
  Senha: MUDE_ESTA_SENHA_AQUI
```

### Domínio & SSL
```
Domínio: frotadpl.wlsolucoes.eti.br
Cloudflare: Full Mode (recomendado)
Certificado: Auto-assinado (validado por CF)
```

### Endpoints Principais
```
Health: GET /health
API Docs: GET /docs (Swagger)
ReDoc: GET /redoc
Veículos: GET /api/veiculos
Login: POST /auth/login
```

---

## ✨ Próximos Passos Opcionais

1. **Configurar backups automáticos**
   ```bash
   crontab -e
   # 0 2 * * * /backup_script.sh
   ```

2. **Habilitar Full Strict** (se quiser certificado próprio)
   - Gerar Cloudflare Origin Certificate
   - Instalar em `/etc/ssl/cloudflare/`
   - Atualizar Nginx

3. **Adicionar monitoramento**
   - Prometheus + Grafana
   - NewRelic ou similar

4. **Configurar email/SMTP**
   - Para notificações automáticas
   - Alertas de sistema

---

## 🎉 Status Final

✅ **Aplicação**: Pronta  
✅ **Docker**: Configurado  
✅ **Documentação**: Completa  
✅ **Segurança**: Implementada  
✅ **Scripts**: Testados  

🚀 **Pronto para subir em VPS quando desejar!**

---

**Última atualização**: 2024-01-12  
**Autor**: GitHub Copilot  
**Versão da App**: 1.0.0

Para dúvidas, consulte [DEPLOY_INSTRUCTIONS.md](DEPLOY_INSTRUCTIONS.md) 📖
