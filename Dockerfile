FROM python:3.11-slim

WORKDIR /app

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements e instalar
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código
COPY backend/ .
COPY frontend/ ./frontend

# Criar diretórios necessários
RUN mkdir -p uploads data

# Expor porta
EXPOSE 8000

# Health check usando curl
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Comando para inicializar o banco e rodar a API com múltiplos workers
CMD ["sh", "-c", "python init_db_prod.py && uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4 --log-level info"]
