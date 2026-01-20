#!/bin/bash
# Script de backup automático do PostgreSQL
# Adicione ao crontab para executar diariamente:
# 0 2 * * * /root/app_frota/backup_db.sh

set -e

# Configurações
BACKUP_DIR="/root/app_frota/backups"
RETENTION_DAYS=7
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/frota_backup_$DATE.sql.gz"

# Criar diretório de backups
mkdir -p $BACKUP_DIR

# Fazer backup
echo "[$(date)] Iniciando backup do banco de dados..."
docker compose exec -T db pg_dump -U frota_user frota_db | gzip > $BACKUP_FILE

# Verificar se backup foi criado
if [ -f "$BACKUP_FILE" ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "[$(date)] Backup criado: $BACKUP_FILE ($SIZE)"
else
    echo "[$(date)] ERRO: Backup falhou!"
    exit 1
fi

# Remover backups antigos
echo "[$(date)] Removendo backups com mais de $RETENTION_DAYS dias..."
find $BACKUP_DIR -name "frota_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "[$(date)] Backup concluído com sucesso!"
