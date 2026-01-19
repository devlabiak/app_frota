from .auth import router as auth_router
from .admin import router as admin_router
from .coleta import router as coleta_router

__all__ = ["auth_router", "admin_router", "coleta_router"]
