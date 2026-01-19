#!/bin/bash

# ============================================================================
# Script de Deployment da Aplicação App_Frota no VPS
# Cloudflare Full Mode (HTTP origin, HTTPS em edge)
# ============================================================================

set -e  # Exit on any error

echo "=========================================="
echo "DEPLOY App_Frota - VPS Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================================================
# STEP 1: Cleanup old containers and images
# ============================================================================
echo -e "${YELLOW}[1/7] Limpando containers e imagens antigas...${NC}"
docker compose down 2>/dev/null || true
docker system prune -f 2>/dev/null || true
echo -e "${GREEN}✓ Cleanup concluído${NC}\n"

# ============================================================================
# STEP 2: Clone repository
# ============================================================================
echo -e "${YELLOW}[2/7] Clonando repositório GitHub...${NC}"
cd ~
rm -rf app_frota 2>/dev/null || true
git clone https://github.com/devlabiak/app_frota.git
cd app_frota
echo -e "${GREEN}✓ Repositório clonado${NC}\n"

# ============================================================================
# STEP 3: Create production .env file
# ============================================================================
echo -e "${YELLOW}[3/7] Configurando variáveis de ambiente...${NC}"

# Check if .env exists and is valid
if [ ! -f .env ]; then
    cat > .env << 'EOF'
# Production Environment Configuration
ENVIRONMENT=production
DEBUG=False

# Database (CHANGE THIS PASSWORD!)
DATABASE_URL=postgresql://frota_user:MUDE_ESTA_SENHA_AQUI@db:5432/frota_db

# Security (keep current SECRET_KEY or generate new)
SECRET_KEY=_uvlaPZAtgJrJluydAO_umOm0sdk1FHCA_27cgDixY3tc2hW6T3PHesxU4482ePtP41ZTizZYxWy0ncHHFTRFA

# Features
RATE_LIMIT_ENABLED=True
LOG_LEVEL=INFO
EOF

    echo -e "${YELLOW}ATENÇÃO: Arquivo .env criado. MUDE A SENHA DO BANCO DE DADOS!${NC}"
    echo -e "${YELLOW}Edite: nano .env${NC}"
    echo -e "${YELLOW}Depois continue o deployment.${NC}"
    exit 1
else
    echo -e "${GREEN}✓ .env encontrado${NC}"
fi

# Update postgres password in compose if needed
echo -e "${YELLOW}Atualizando senha PostgreSQL no docker-compose...${NC}"
sed -i 's/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=MUDE_ESTA_SENHA_AQUI/' docker-compose.yml || true
echo -e "${GREEN}✓ Configuração de ambiente pronta${NC}\n"

# ============================================================================
# STEP 4: Install Docker Compose plugin
# ============================================================================
echo -e "${YELLOW}[4/7] Instalando Docker Compose plugin...${NC}"
sudo apt-get update
sudo apt-get install -y docker-compose-plugin
docker compose version
echo -e "${GREEN}✓ Docker Compose instalado${NC}\n"

# ============================================================================
# STEP 5: Start containers
# ============================================================================
echo -e "${YELLOW}[5/7] Iniciando containers...${NC}"
docker compose up -d

# Wait for database to be ready
echo -e "${YELLOW}Aguardando banco de dados ficar pronto...${NC}"
sleep 15

# Check if containers are healthy
if docker compose ps | grep -q "healthy"; then
    echo -e "${GREEN}✓ Containers iniciados e saudáveis${NC}\n"
else
    echo -e "${RED}✗ Erro ao iniciar containers${NC}"
    docker compose logs
    exit 1
fi

# ============================================================================
# STEP 6: Initialize database
# ============================================================================
echo -e "${YELLOW}[6/7] Inicializando banco de dados...${NC}"
docker exec app-frota-api python init_db_prod.py
echo -e "${GREEN}✓ Banco de dados inicializado${NC}\n"

# ============================================================================
# STEP 7: Install and configure Nginx
# ============================================================================
echo -e "${YELLOW}[7/7] Instalando e configurando Nginx...${NC}"

# Install Nginx
sudo apt-get install -y nginx

# Create Nginx configuration for Cloudflare Full Mode
sudo tee /etc/nginx/sites-available/app_frota > /dev/null << 'EOF'
# HTTP → HTTPS redirect
server {
    listen 80;
    server_name frotadpl.wlsolucoes.eti.br;
    
    # Cloudflare health checks
    location /.well-known {
        alias /var/www/html/.well-known;
    }
    
    # Redirect all HTTP to HTTPS
    return 301 https://$host$request_uri;
}

# HTTPS Server (Cloudflare Full Mode)
# In Full mode, Cloudflare handles HTTPS at edge
# We accept connections from Cloudflare on HTTP and Nginx handles it
server {
    listen 443 ssl http2;
    server_name frotadpl.wlsolucoes.eti.br;
    
    # Self-signed certificate (Cloudflare validates origin with Full mode)
    # For Full Strict mode, you'd need a valid certificate from Cloudflare
    ssl_certificate /etc/ssl/certs/nginx-selfsigned.crt;
    ssl_certificate_key /etc/ssl/private/nginx-selfsigned.key;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Proxy settings
    client_max_body_size 50M;
    
    # Reverse proxy to FastAPI on localhost:8000
    location / {
        proxy_pass http://127.0.0.1:8000;
        
        # Headers required by FastAPI
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $server_name;
        
        # Cloudflare real IP
        # These headers are sent by Cloudflare
        proxy_set_header CF-Connecting-IP $remote_addr;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Access and error logs
    access_log /var/log/nginx/app_frota_access.log;
    error_log /var/log/nginx/app_frota_error.log;
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/app_frota /etc/nginx/sites-enabled/app_frota
sudo rm -f /etc/nginx/sites-enabled/default

# Generate self-signed certificate (for Cloudflare Full Mode)
if [ ! -f /etc/ssl/certs/nginx-selfsigned.crt ]; then
    echo -e "${YELLOW}Gerando certificado auto-assinado...${NC}"
    sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/ssl/private/nginx-selfsigned.key \
        -out /etc/ssl/certs/nginx-selfsigned.crt \
        -subj "/C=BR/ST=SP/L=SP/O=App Frota/CN=frotadpl.wlsolucoes.eti.br"
fi

# Test Nginx configuration
sudo nginx -t

# Enable and start Nginx
sudo systemctl enable nginx
sudo systemctl restart nginx

echo -e "${GREEN}✓ Nginx instalado e configurado${NC}\n"

# ============================================================================
# Health checks
# ============================================================================
echo -e "${YELLOW}Executando health checks...${NC}"
echo ""

# Check API health
echo "API health check:"
curl -s http://127.0.0.1:8000/health || echo "✗ API não respondeu"
echo ""

# Check Nginx
echo "Nginx status:"
sudo systemctl status nginx | grep Active || echo "✗ Nginx não está rodando"
echo ""

# Check containers
echo "Docker containers:"
docker compose ps
echo ""

# ============================================================================
# Summary and Next Steps
# ============================================================================
echo -e "${GREEN}=========================================="
echo "✓ DEPLOYMENT CONCLUÍDO COM SUCESSO!"
echo "=========================================${NC}\n"

echo -e "${YELLOW}PRÓXIMOS PASSOS:${NC}"
echo ""
echo "1. IMPORTANTE: Edite .env se ainda não fez:"
echo -e "   ${YELLOW}nano ~/app_frota/.env${NC}"
echo "   - Mude a senha do PostgreSQL em dois lugares"
echo "   - Salve com Ctrl+X, Y, Enter"
echo ""
echo "2. Reinicie os containers com a nova senha:"
echo -e "   ${YELLOW}cd ~/app_frota && docker compose down && docker compose up -d${NC}"
echo ""
echo "3. Verifique se tudo está funcionando:"
echo -e "   ${YELLOW}curl http://localhost:8000/health${NC}"
echo -e "   ${YELLOW}curl https://frotadpl.wlsolucoes.eti.br/health${NC}"
echo ""
echo "4. Cloudflare: Certifique-se que está em modo 'Full' SSL/TLS"
echo "   - Dashboard → SSL/TLS → Overview"
echo "   - Deve estar em 'Full' (não Full Strict)"
echo ""
echo -e "${YELLOW}Verificar logs:${NC}"
echo -e "   Docker API: ${YELLOW}docker compose logs -f api${NC}"
echo -e "   Docker DB: ${YELLOW}docker compose logs -f db${NC}"
echo -e "   Nginx: ${YELLOW}sudo tail -f /var/log/nginx/app_frota_error.log${NC}"
echo ""
echo -e "${YELLOW}Acesso à aplicação:${NC}"
echo -e "   URL: ${GREEN}https://frotadpl.wlsolucoes.eti.br${NC}"
echo -e "   Usuário: ${GREEN}admin${NC}"
echo -e "   Senha: ${GREEN}admin${NC}"
echo ""
