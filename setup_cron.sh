#!/bin/bash
# Script para configurar cron jobs automáticos na VPS
# Execute: chmod +x setup_cron.sh && ./setup_cron.sh

echo "🔧 Configurando cron jobs para manutenção automática..."

CRON_FILE="/tmp/app_frota_cron.txt"
APP_DIR="/root/app_frota"

# Criar arquivo de cron jobs
cat > $CRON_FILE << 'EOF'
# Backup automático diariamente às 02:00 da manhã
0 2 * * * /root/app_frota/backup_db.sh >> /root/app_frota/backups/backup.log 2>&1

# Verificar saúde do container a cada 5 minutos
*/5 * * * * docker ps | grep -q app-frota-api || (echo "[$(date)] Container API down!" >> /root/app_frota/health.log && docker compose -f /root/app_frota/docker-compose.yml up -d)

# Limpeza de fotos antigas - executado automaticamente pelo APScheduler no main.py
# Backup: se scheduler falhar, roda manualmente uma vez por mês
0 3 1 * * docker exec app-frota-api python /app/cleanup_old_photos.py >> /root/app_frota/cleanup.log 2>&1

EOF

# Adicionar ao crontab se não existir
if crontab -l 2>/dev/null | grep -q "backup_db.sh"; then
    echo "✓ Cron jobs já configurados"
else
    crontab $CRON_FILE
    echo "✓ Cron jobs instalados com sucesso!"
fi

# Configurar logrotate
echo ""
echo "📝 Configurando logrotate..."
if [ -f "$APP_DIR/logrotate.conf" ]; then
    sudo cp $APP_DIR/logrotate.conf /etc/logrotate.d/app_frota
    sudo chmod 644 /etc/logrotate.d/app_frota
    echo "✓ Logrotate configurado"
    
    # Testar configuração
    sudo logrotate -d /etc/logrotate.d/app_frota > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✓ Configuração de logrotate válida"
    else
        echo "⚠️ Aviso: Erro na configuração do logrotate"
    fi
else
    echo "⚠️ Arquivo logrotate.conf não encontrado"
fi

# Criar diretórios necessários
mkdir -p $APP_DIR/backups
mkdir -p $APP_DIR/logs

# Definir permissões
chmod 755 $APP_DIR/backup_db.sh 2>/dev/null || true
chmod 755 $APP_DIR/setup_env.sh 2>/dev/null || true

echo ""
echo "✅ Setup de cron jobs concluído!"
echo ""
echo "📋 Cron jobs instalados:"
echo "  • Backup automático: 02:00 todos os dias"
echo "  • Health check: a cada 5 minutos"
echo "  • Cleanup de fotos: APScheduler (02:00 todos os dias)"
echo "  • Logrotate: diário com retenção de 30 dias"
echo ""
echo "Ver logs:"
echo "  tail -f /root/app_frota/backups/backup.log"
echo "  tail -f /root/app_frota/health.log"
echo ""
echo "Ver cron jobs instalados:"
echo "  crontab -l"

