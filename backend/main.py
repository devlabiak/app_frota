from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.database import Base, engine
from app.rotas import auth_router, admin_router, coleta_router
from app.config import settings
import os
import logging
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# ===== CONFIGURAÇÃO DE LOGGING =====
log_level = getattr(logging, settings.LOG_LEVEL, logging.INFO)
logging.basicConfig(
    level=log_level,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Criar tabelas
logger.info("Criando tabelas do banco de dados...")
Base.metadata.create_all(bind=engine)
logger.info("✓ Tabelas criadas com sucesso")

# ===== RATE LIMITING =====
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[f"{settings.RATE_LIMIT_PER_MINUTE}/minute"] if settings.RATE_LIMIT_ENABLED else []
)

app = FastAPI(
    title="App Frota",
    description="Aplicação para controle de frota com offline-first",
    version="1.0.0"
)

# Adicionar rate limiter ao app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ===== CORS - Configurado para aceitar acesso móvel (4G/5G) =====
# Em produção, usuários acessam de vários locais (4G, WiFi, etc)
# Como não temos domínio fixo e usuários usam IPs dinâmicos,
# precisamos permitir todas as origens mas com segurança via tokens JWT
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Necessário para acesso móvel com IPs dinâmicos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)
logger.info("CORS configurado para acesso móvel (4G/5G)")

# ===== MIDDLEWARE DE LOGGING =====
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = datetime.utcnow()
    
    # Log da requisição
    logger.info(f"→ {request.method} {request.url.path} - IP: {request.client.host}")
    
    response = await call_next(request)
    
    # Desabilitar cache para arquivos estáticos (CSS, JS, HTML)
    if any(request.url.path.endswith(ext) for ext in ['.css', '.js', '.html']):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    
    # Log da resposta
    process_time = (datetime.utcnow() - start_time).total_seconds()
    logger.info(f"← {request.method} {request.url.path} - Status: {response.status_code} - Tempo: {process_time:.3f}s")
    
    return response

# Criar pastas se não existirem
os.makedirs("frontend/css", exist_ok=True)
os.makedirs("frontend/js", exist_ok=True)
os.makedirs("uploads", exist_ok=True)
logger.info("✓ Diretórios verificados/criados")

# Servir arquivos estáticos
app.mount("/css", StaticFiles(directory="frontend/css"), name="css")
app.mount("/js", StaticFiles(directory="frontend/js"), name="js")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Rotas para servir arquivos individuais
@app.get("/style.css")
def get_style():
    return FileResponse("frontend/css/style.css")

@app.get("/api.js")
def get_api_js():
    return FileResponse("frontend/js/api.js")

@app.get("/app.js")
def get_app_js():
    return FileResponse("frontend/js/app.js")

@app.get("/manifest.json")
def get_manifest():
    return FileResponse("frontend/manifest.json")

@app.get("/dpl.png")
def get_dpl_logo():
    return FileResponse("frontend/dpl.png")

@app.get("/wl.png")
def get_wl_logo():
    return FileResponse("frontend/wl.png")

# Rotas de API
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(coleta_router)
logger.info("✓ Rotas registradas")

# ===== SCHEDULER DE LIMPEZA DE FOTOS =====
def cleanup_job():
    """Tarefa agendada para limpar fotos com mais de 60 dias"""
    from cleanup_old_photos import cleanup_old_photos
    try:
        logger.info("🗑️ Iniciando limpeza de fotos antigas...")
        cleanup_old_photos()
        logger.info("✓ Limpeza concluída")
    except Exception as e:
        logger.error(f"❌ Erro no scheduler de limpeza: {e}", exc_info=True)

# Inicializar scheduler
scheduler = BackgroundScheduler()
scheduler.add_job(cleanup_job, 'cron', hour=2, minute=0)
scheduler.start()
logger.info("✓ Scheduler iniciado - Limpeza agendada para 02:00 todos os dias")

# Servir index.html na raiz
@app.get("/")
def read_root():
    response = FileResponse("frontend/index.html", media_type="text/html")
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

@app.get("/version")
def get_version():
    """Retorna timestamp da última atualização para cache busting"""
    return {"version": datetime.utcnow().timestamp()}

@app.get("/health")
def health():
    return {"status": "ok", "environment": settings.ENVIRONMENT}

# Log ao iniciar
@app.on_event("startup")
async def startup_event():
    logger.info("="*60)
    logger.info("🚀 App Frota iniciado com sucesso!")
    logger.info(f"Ambiente: {settings.ENVIRONMENT}")
    logger.info(f"Debug: {settings.DEBUG}")
    logger.info(f"Rate Limiting: {settings.RATE_LIMIT_ENABLED}")
    logger.info("="*60)

@app.on_event("shutdown")
async def shutdown_event():
    scheduler.shutdown()
    logger.info("🛑 App Frota encerrado")
