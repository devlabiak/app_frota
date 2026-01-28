#!/bin/bash
# Script de backup automático do PostgreSQL
# Adicione ao crontab para executar diariamente:
# 0 2 * * * /root/app_frota/backup_db.sh >> /root/app_frota/backups/backup.log 2>&1

set -e

# Configurações
BACKUP_DIR="/root/app_frota/backups"
RETENTION_DAYS=7
MAX_BACKUPS=30
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/frota_backup_$DATE.sql.gz"
LOG_FILE="$BACKUP_DIR/backup.log"

# Criar diretório de backups
mkdir -p $BACKUP_DIR

# Log com timestamp
echo "[$(date '+%Y-%m-%d %H:%M:%S')] ===== INICIANDO BACKUP =====" >> $LOG_FILE

# Verificar espaço em disco
AVAILABLE_SPACE=$(df $BACKUP_DIR | awk 'NR==2 {print $4}')
REQUIRED_SPACE=$((500 * 1024))  # 500MB mínimo
if [ $AVAILABLE_SPACE -lt $REQUIRED_SPACE ]; then
    echo "[$(date)] ❌ ERRO: Espaço insuficiente em disco! Disponível: ${AVAILABLE_SPACE}KB, Requerido: ${REQUIRED_SPACE}KB" >> $LOG_FILE
    exit 1
fi

# Fazer backup
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Fazendo dump do banco de dados..." >> $LOG_FILE
if docker compose exec -T db pg_dump -U frota_user frota_db | gzip > $BACKUP_FILE; then
    # Verificar se backup foi criado
    if [ -f "$BACKUP_FILE" ]; then
        SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✓ Backup criado com sucesso: $BACKUP_FILE ($SIZE)" >> $LOG_FILE
    else
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ ERRO: Arquivo de backup não foi criado!" >> $LOG_FILE
        exit 1
    fi
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ ERRO: pg_dump falhou!" >> $LOG_FILE
    exit 1
fi

# Remover backups antigos (manter apenas últimos 30)
BACKUP_COUNT=$(ls -1 $BACKUP_DIR/frota_backup_*.sql.gz 2>/dev/null | wc -l)
if [ $BACKUP_COUNT -gt $MAX_BACKUPS ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🗑️ Removendo backups antigos (mantendo últimos $MAX_BACKUPS)..." >> $LOG_FILE
    ls -1t $BACKUP_DIR/frota_backup_*.sql.gz | tail -n +$((MAX_BACKUPS + 1)) | xargs rm -v >> $LOG_FILE
fi

# Também remover por data
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Removendo backups com mais de $RETENTION_DAYS dias..." >> $LOG_FILE
find $BACKUP_DIR -name "frota_backup_*.sql.gz" -mtime +$RETENTION_DAYS -exec rm -v {} \; >> $LOG_FILE 2>&1 || true

# Resumo
CURRENT_COUNT=$(ls -1 $BACKUP_DIR/frota_backup_*.sql.gz 2>/dev/null | wc -l)
TOTAL_SIZE=$(du -sh $BACKUP_DIR | cut -f1)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Resumo: $CURRENT_COUNT backups, Tamanho total: $TOTAL_SIZE" >> $LOG_FILE
echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✓ Backup concluído com sucesso!" >> $LOG_FILE
echo "[$(date '+%Y-%m-%d %H:%M:%S')] ========================================" >> $LOG_FILE
