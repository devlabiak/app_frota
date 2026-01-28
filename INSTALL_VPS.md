# 🚀 Setup Rápido na VPS - App Frota 24/7

## Pré-requisitos
- Docker e Docker Compose instalados
- Ubuntu 20.04+ ou Debian 11+

## Instalação Completa em 5 Passos

### 1️⃣ Clone o Repositório
```bash
cd /root
git clone https://github.com/devlabiak/app_frota.git
cd app_frota
```

### 2️⃣ Configure Variáveis de Ambiente (Opcional - Alterar Senhas)
```bash
chmod +x setup_env.sh
./setup_env.sh

# Editar senhas (RECOMENDADO):
nano .env.production

# Após editar, copiar para .env:
cp .env.production .env
```

### 3️⃣ Inicie os Containers
```bash
docker compose up -d --build
sleep 20

# Verificar status:
docker compose ps
```

### 4️⃣ Inicialize o Banco de Dados
```bash
docker exec app-frota-api python init_db_prod.py
```

### 5️⃣ Configure Backups e Manutenção Automática
```bash
chmod +x setup_cron.sh
./setup_cron.sh
```

## ✅ Verificar Funcionamento

```bash
# Testar API
curl http://localhost:8000/health

# Ver logs
docker compose logs -f api

# Status containers
docker compose ps
```

## 🔐 Credenciais Padrão
- **Usuário:** admin
- **Senha:** admin
- **⚠️ MUDE após primeiro login!**

## 🛠️ Comandos Úteis

### Ver Logs
```bash
docker compose logs -f api
docker compose logs -f db
tail -f /root/app_frota/backups/backup.log
```

### Reiniciar Serviços
```bash
docker compose restart api
docker compose restart db
```

### Atualizar do GitHub
```bash
cd /root/app_frota
git pull origin main
docker compose down
docker compose up -d --build
```

### Backup Manual
```bash
/root/app_frota/backup_db.sh
```

### Restaurar Backup
```bash
# Listar backups disponíveis
ls -lh /root/app_frota/backups/

# Restaurar backup específico
gunzip < /root/app_frota/backups/frota_backup_YYYYMMDD_HHMMSS.sql.gz | \
  docker exec -i app-frota-db psql -U frota_user frota_db
```

### Limpar Fotos Antigas Manualmente
```bash
docker exec app-frota-api python /app/cleanup_old_photos.py
```

### Ver Cron Jobs
```bash
crontab -l
```

### Monitorar Recursos
```bash
docker stats
htop
df -h
```

## 📊 O Que Foi Configurado Automaticamente

✅ **Pool de Conexões:** 100 conexões (50 base + 50 overflow)  
✅ **Backup Automático:** Diariamente às 02:00  
✅ **Limpeza de Fotos:** Automática a cada dia (fotos > 90 dias)  
✅ **Compressão de Imagens:** JPEG quality 85%, redimensiona > 1920px  
✅ **Health Check:** Containers verificados a cada 5 minutos  
✅ **Logrotate:** Retenção de 30 dias  
✅ **Token JWT:** Válido por 24 horas  
✅ **Upload:** Máximo 50MB  

## 🚨 Troubleshooting

### Container não inicia
```bash
docker compose logs api
docker compose down -v
docker compose up -d --build
```

### Erro de conexão com banco
```bash
docker exec app-frota-db pg_isready -U frota_user
docker compose restart db
```

### Disco cheio
```bash
# Ver uso
df -h

# Limpar Docker
docker system prune -a --volumes

# Limpar fotos antigas
docker exec app-frota-api python /app/cleanup_old_photos.py

# Limpar backups antigos
find /root/app_frota/backups -name "*.sql.gz" -mtime +30 -delete
```

### API lenta
```bash
# Ver conexões ativas
docker exec app-frota-db psql -U frota_user frota_db -c \
  "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"

# Reiniciar API
docker compose restart api
```

## 📞 Suporte

- **Logs:** `/root/app_frota/backups/backup.log`
- **Health:** `/root/app_frota/health.log`
- **Documentação completa:** Ver `PRODUCTION.md`
