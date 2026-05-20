from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.db.session import get_db
from app.services.dividend_service import (
    get_dividends_by_year,
    get_dividends_by_ticker_and_year,
    get_dividends_monthly,
    get_dividends_by_account,
)

router = APIRouter(prefix="/dividends", tags=["dividends"])


@router.get("/summary/yearly")
def dividends_yearly(db: Session = Depends(get_db)):
    """Podsumowanie dywidend per rok (brutto/podatek/netto w PLN)."""
    return get_dividends_by_year(db)


@router.get("/summary/by-ticker")
def dividends_by_ticker(
    year: Optional[int] = Query(None, description="Filtruj po roku"),
    db: Session = Depends(get_db),
):
    """Dywidendy per ticker per rok."""
    data = get_dividends_by_ticker_and_year(db)
    if year:
        data = [d for d in data if d["year"] == year]
    return data


@router.get("/summary/by-account")
def dividends_by_account(
    year: Optional[int] = Query(None, description="Filtruj po roku"),
    db: Session = Depends(get_db),
):
    """Dywidendy per konto per rok — kwoty w walucie rachunku i w PLN."""
    return get_dividends_by_account(db, year)


@router.get("/summary/monthly")
def dividends_monthly(
    year: Optional[int] = Query(None, description="Filtruj po roku"),
    db: Session = Depends(get_db),
):
    """Dywidendy per miesiąc — do wykresu słupkowego."""
    return get_dividends_monthly(db, year)
