#!/bin/bash
# Script para mover credenciais de docker-compose.yml para .env

echo "🔒 Movendo credenciais sensíveis para arquivo .env..."

# Criar .env.production se não existir
if [ ! -f .env.production ]; then
    cat > .env.production << 'EOF'
# Production Environment Configuration - NÃO COMITAR!
ENVIRONMENT=production
DEBUG=False

# Database - MUDE ESTAS CREDENCIAIS!
POSTGRES_DB=frota_db
POSTGRES_USER=frota_user
POSTGRES_PASSWORD=FrotaBD2026#Secure!
DATABASE_URL=postgresql://frota_user:FrotaBD2026#Secure!@db:5432/frota_db

# Security - GERE UM NOVO SECRET_KEY!
# Gerar novo: python -c "import secrets; print(secrets.token_urlsafe(50))"
SECRET_KEY=_uvlaPZAtgJrJluydAO_umOm0sdk1FHCA_27cgDixY3tc2hW6T3PHesxU4482ePtP41ZTizZYxWy0ncHHFTRFA

# Features
RATE_LIMIT_ENABLED=True
LOG_LEVEL=INFO
EOF
    chmod 600 .env.production
    echo "✓ Arquivo .env.production criado com permissões 600"
else
    echo "✓ Arquivo .env.production já existe"
fi

echo ""
echo "⚠️ IMPORTANTE:"
echo "1. Adicione .env.production ao .gitignore"
echo "2. Nunca commite credenciais no git"
echo "3. Use variáveis de ambiente em produção"
echo "4. Regenere SECRET_KEY em produção!"
