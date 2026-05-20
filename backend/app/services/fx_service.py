"""
Serwis kursów walut — NBP API.
Pobiera kursy EUR/PLN i USD/PLN i cache'uje je w bazie danych.
"""
import logging
from datetime import date, timedelta
from decimal import Decimal
from typing import Optional

import httpx
from sqlalchemy.orm import Session

from app.models.other import FxRate

logger = logging.getLogger(__name__)
NBP_API_URL = "https://api.nbp.pl/api"

# In-memory cache żeby nie odpytywać bazy dla każdej transakcji w imporcie
_cache: dict[tuple, Decimal] = {}


def get_or_fetch_fx_rate(
    db: Session,
    from_currency: str,
    to_currency: str,
    rate_date: date,
) -> Optional[Decimal]:
    """
    Pobiera kurs walutowy z bazy lub z NBP API.
    NBP nie ma kursów weekendowych — cofa się do ostatniego dnia roboczego.
    """
    if from_currency == to_currency:
        return Decimal("1")

    cache_key = (from_currency, to_currency, rate_date)
    if cache_key in _cache:
        return _cache[cache_key]

    # Sprawdź bazę
    existing = db.query(FxRate).filter_by(
        from_currency=from_currency,
        to_currency=to_currency,
        rate_date=rate_date,
    ).first()
    if existing:
        _cache[cache_key] = existing.rate
        return existing.rate

    # Pobierz z NBP (próbuj cofając się max 5 dni — weekendy, święta)
    rate = _fetch_from_nbp(from_currency, rate_date)
    if rate is None:
        logger.warning(f"Brak kursu NBP {from_currency}/PLN dla {rate_date}")
        return None

    # Zapisz w bazie
    fx = FxRate(
        from_currency=from_currency,
        to_currency=to_currency,
        rate=rate,
        rate_date=rate_date,
        source="NBP",
    )
    db.add(fx)
    # Nie commitujemy tutaj — commit robi wywołujący

    _cache[cache_key] = rate
    return rate


def _fetch_from_nbp(currency: str, target_date: date, retries: int = 5) -> Optional[Decimal]:
    """Pobiera kurs z NBP API, cofa się o jeden dzień jeśli brak danych."""
    for i in range(retries):
        check_date = target_date - timedelta(days=i)
        url = f"{NBP_API_URL}/exchangerates/rates/A/{currency}/{check_date}/?format=json"
        try:
            resp = httpx.get(url, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                rate = Decimal(str(data["rates"][0]["mid"]))
                logger.debug(f"NBP {currency}/PLN {check_date}: {rate}")
                return rate
            elif resp.status_code == 404:
                continue  # brak dla tej daty, próbuj wcześniej
        except Exception as e:
            logger.error(f"NBP API error: {e}")
            break
    return None


def fetch_current_fx_rates(db: Session) -> dict[str, Decimal]:
    """Pobiera aktualne kursy EUR i USD do PLN."""
    today = date.today()
    rates = {}
    for currency in ["EUR", "USD"]:
        rate = get_or_fetch_fx_rate(db, currency, "PLN", today)
        if rate:
            rates[currency] = rate
    db.commit()
    return rates
