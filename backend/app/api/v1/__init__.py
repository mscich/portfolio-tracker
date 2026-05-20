from fastapi import APIRouter
from app.api.v1.endpoints import dividends, positions, import_xtb, transactions

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(dividends.router)
api_router.include_router(positions.router)
api_router.include_router(import_xtb.router)
api_router.include_router(transactions.router)
