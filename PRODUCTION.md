# Guia de Produção 24/7

## ✅ Melhorias Aplicadas

### Performance
- **4 workers Uvicorn** - suporta múltiplos usuários simultâneos
- **Pool de conexões PostgreSQL** - 10 conexões + 20 overflow
- **PostgreSQL otimizado** - parâmetros ajustados para produção
- **Limites de recursos** - previne consumo excessivo de CPU/RAM

### Confiabilidade
- **Health checks** - API e banco monitorados a cada 30s/10s
- **Restart automático** - containers reiniciam se falharem
- **Depends on condition** - API aguarda banco estar saudável

## 🔧 Configurações Aplicadas

### Uvicorn
- 4 workers (1 por núcleo de CPU)
- Log level: INFO

### PostgreSQL
- 100 conexões máximas
- 256MB shared_buffers
- 1GB effective_cache_size
- Otimizado para SSD (random_page_cost=1.1)
- Parallel workers habilitados

### Banco de Dados (Melhorias)
- Pool de conexões: 20 (antes 10) + 30 overflow = 50 máximo
- Conexões recicladas a cada 1 hora
- Health check a cada 10 segundos

### Docker
**API:**
- CPU: 0.5-2.0 cores
- RAM: 512MB-1GB
- Healthcheck: a cada 30 segundos

**Database:**
- CPU: 0.25-1.0 cores
- RAM: 256MB-512MB
- Healthcheck: a cada 10 segundos

### Segurança
- Token JWT: 24 horas (antes 11 horas)
- Max upload: 50MB (antes 10MB)
- Rate limiting: 60 req/min por IP
- HTTPS obrigatório via Cloudflare

## 📦 Deploy das Melhorias

```bash
cd ~/app_frota
git pull origin main
docker compose down
docker compose up -d --build
sleep 40
docker compose ps
docker compose logs api --tail 20
```

## 🔄 Backup Automático

### Configurar cron para backup diário

```bash
# Tornar script executável
chmod +x backup_db.sh

# Adicionar ao crontab (backup às 2h da manhã)
crontab -e
# Adicionar linha:
0 2 * * * /root/app_frota/backup_db.sh >> /root/app_frota/backup.log 2>&1
```

### Restaurar backup

```bash
# Listar backups disponíveis
ls -lh backups/

# Restaurar backup específico
gunzip -c backups/frota_backup_YYYYMMDD_HHMMSS.sql.gz | \
  docker compose exec -T db psql -U frota_user frota_db
```

## 📊 Monitoramento Recomendado

### 1. Uptime Robot (gratuito)
- Monitorar: `https://frotadpl.wlsolucoes.eti.br/health`
- Intervalo: 5 minutos
- Alertas: email/SMS quando cair

### 2. Logs em tempo real

```bash
# Logs da API (seguir em tempo real)
docker compose logs -f api

# Logs do banco
docker compose logs -f db

# Últimas 100 linhas
docker compose logs --tail 100
```

### 3. Status dos containers

```bash
# Ver status
docker compose ps

# Uso de recursos
docker stats app-frota-api app-frota-db

# Health checks
docker inspect app-frota-api --format='{{.State.Health.Status}}'
```

### 4. Estatísticas do PostgreSQL

```bash
# Conexões ativas
docker compose exec db psql -U frota_user frota_db -c \
  "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"

# Tamanho do banco
docker compose exec db psql -U frota_user frota_db -c \
  "SELECT pg_size_pretty(pg_database_size('frota_db'));"

# Queries lentas (> 1s)
docker compose exec db psql -U frota_user frota_db -c \
  "SELECT query, calls, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
```

## 🚨 Alertas e Incidentes

### Container reiniciando constantemente

```bash
# Ver erro
docker compose logs api --tail 50

# Verificar saúde do banco
docker compose exec db pg_isready -U frota_user

# Rebuild forçado
docker compose down
docker compose up -d --build --force-recreate
```

### Banco de dados lento

```bash
# Verificar conexões
docker compose exec db psql -U frota_user frota_db -c \
  "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"

# Vacuum (manutenção)
docker compose exec db psql -U frota_user frota_db -c "VACUUM ANALYZE;"
```

### Disco cheio

```bash
# Ver uso de disco
df -h

# Limpar logs antigos do Docker
docker system prune -a --volumes

# Limpar fotos antigas (> 60 dias)
find uploads/ -type f -mtime +60 -delete
```

### Alta latência

```bash
# Verificar workers ativos
docker compose exec api ps aux | grep uvicorn

# Ver conexões do banco
docker compose exec db psql -U frota_user frota_db -c \
  "SELECT count(*) FROM pg_stat_activity;"

# Reiniciar apenas API (sem perder dados)
docker compose restart api
```

## 📈 Capacidade Estimada

**Com 4 workers + PostgreSQL otimizado:**
- **10-20 usuários simultâneos** - sem problemas
- **50-100 requisições/minuto** - performance ótima
- **Rate limit**: 60 req/min por IP

**Sinais de necessidade de upgrade:**
- CPU > 80% constantemente
- RAM > 90% por mais de 5 minutos
- Latência > 2 segundos
- Erros 503 (Service Unavailable)

## 🔐 Checklist de Segurança

- [x] HTTPS com TLS 1.2/1.3
- [x] Senha forte do PostgreSQL
- [x] SECRET_KEY forte (64 caracteres)
- [x] HSTS habilitado
- [x] Rate limiting ativo
- [x] PostgreSQL sem exposição externa
- [ ] Senha do admin alterada (IMPORTANTE!)
- [ ] Firewall configurado (apenas 22, 80, 443)
- [ ] Backup testado (fazer restore teste)
- [ ] Monitoramento configurado

## 📞 Manutenção Recomendada

### Diariamente
- Verificar logs de erro
- Confirmar backup executou

### Semanalmente
- Revisar métricas de uso
- Verificar espaço em disco
- Testar restore de backup

### Mensalmente
- Atualizar imagens Docker
- Revisar usuários ativos
- Limpar fotos antigas manualmente
- Vacuum do PostgreSQL

## 🎯 Próximos Passos (Opcional)

### Para tráfego muito alto (>100 usuários):
1. **Load Balancer** - múltiplas instâncias da API
2. **Redis** - cache de sessões e queries
3. **CDN** - Cloudflare para assets estáticos
4. **PostgreSQL replicado** - read replicas
5. **Monitoramento profissional** - Grafana + Prometheus

### Para alta disponibilidade:
1. **Kubernetes** - orquestração
2. **Auto-scaling** - escala automaticamente
3. **Multi-region** - redundância geográfica
