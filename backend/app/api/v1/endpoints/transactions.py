from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.db.session import get_db
from app.services.transaction_service import get_transactions, get_transaction_types

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("")
def list_transactions(
    type: Optional[str] = Query(None, description="Filtruj po rodzaju transakcji"),
    db: Session = Depends(get_db),
):
    return get_transactions(db, type)


@router.get("/types")
def transaction_types(db: Session = Depends(get_db)):
    return get_transaction_types(db)
