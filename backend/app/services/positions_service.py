"""
Serwis otwartych pozycji.
Rekonstruuje pozycje z historii transakcji metodą FIFO/average cost.
"""
import logging
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import text

from app.models import OpenPosition, Transaction, Instrument, Account
from app.services.fx_service import fetch_current_fx_rates, get_or_fetch_fx_rate
from datetime import date

logger = logging.getLogger(__name__)


def rebuild_open_positions(db: Session) -> dict:
    """
    Pełna rekonstrukcja open_positions z transakcji.
    Wywołaj po imporcie lub po każdej nowej transakcji.
    """
    # Wyczyść istniejące pozycje
    db.query(OpenPosition).delete()

    # Pobierz wszystkie transakcje posortowane chronologicznie
    transactions = (
        db.query(Transaction)
        .order_by(Transaction.executed_at.asc())
        .all()
    )

    # Agreguj per (account_id, instrument_id)
    positions: dict[tuple, dict] = {}

    for txn in transactions:
        key = (txn.account_id, txn.instrument_id)
        if key not in positions:
            positions[key] = {
                "quantity": 0,
                "total_cost": Decimal("0"),
                "local_currency": txn.local_currency,
            }

        pos = positions[key]

        if txn.direction == "BUY":
            # Średni ważony koszt nabycia
            old_qty = pos["quantity"]
            old_cost = pos["total_cost"]
            new_qty = old_qty + txn.quantity
            # amount_local jest ujemny przy kupnie, bierzemy abs
            txn_cost = abs(txn.amount_local)
            pos["quantity"] = new_qty
            pos["total_cost"] = old_cost + txn_cost

        elif txn.direction == "SELL":
            # Proporcjonalnie zmniejsz koszt
            if pos["quantity"] > 0:
                avg_price = pos["total_cost"] / Decimal(str(pos["quantity"]))
                sold_cost = avg_price * Decimal(str(txn.quantity))
                pos["quantity"] -= txn.quantity
                pos["total_cost"] -= sold_cost
                if pos["quantity"] < 0:
                    logger.warning(
                        f"Ujemna ilość dla account={txn.account_id} "
                        f"instrument={txn.instrument_id} — sprawdź import"
                    )
                    pos["quantity"] = 0
                    pos["total_cost"] = Decimal("0")

    # Aktualne kursy FX
    fx_rates = fetch_current_fx_rates(db)

    # Zapisz otwarte pozycje (tylko te z ilością > 0)
    stats = {"created": 0, "skipped": 0}
    for (account_id, instrument_id), pos in positions.items():
        if pos["quantity"] <= 0:
            stats["skipped"] += 1
            continue

        qty = pos["quantity"]
        total_cost = pos["total_cost"]
        avg_price = total_cost / Decimal(str(qty)) if qty > 0 else Decimal("0")
        currency = pos["local_currency"]

        # Przelicz na PLN
        fx = fx_rates.get(currency, Decimal("1")) if currency != "PLN" else Decimal("1")
        total_cost_pln = total_cost * fx

        open_pos = OpenPosition(
            account_id=account_id,
            instrument_id=instrument_id,
            quantity=qty,
            avg_cost_price=avg_price,
            total_cost_local=total_cost,
            local_currency=currency,
            current_value_pln=total_cost_pln,  # placeholder — zaktualizuje serwis cen
            unrealized_pln=Decimal("0"),
            unrealized_pct=Decimal("0"),
        )
        db.add(open_pos)
        stats["created"] += 1

    db.commit()
    logger.info(f"Rebuild open_positions: {stats}")
    return stats


def get_positions_summary(db: Session) -> list[dict]:
    """
    Zwraca podsumowanie wszystkich otwartych pozycji z dołączonymi danymi.
    """
    positions = (
        db.query(OpenPosition, Instrument, Account)
        .join(Instrument, OpenPosition.instrument_id == Instrument.id)
        .join(Account, OpenPosition.account_id == Account.id)
        .order_by(OpenPosition.current_value_pln.desc().nullslast())
        .all()
    )

    result = []
    for pos, inst, acc in positions:
        avg_price = float(pos.avg_cost_price or 0)
        current_price = float(pos.current_price or 0)
        total_cost = float(pos.total_cost_local or 0)
        current_value_pln = float(pos.current_value_pln or 0)
        unrealized_pln = float(pos.unrealized_pln or 0)

        result.append({
            "id": pos.id,
            "account_number": acc.account_number,
            "account_currency": acc.currency,
            "ticker": inst.ticker,
            "name": inst.name,
            "exchange": inst.exchange,
            "quantity": pos.quantity,
            "avg_cost_price": avg_price,
            "total_cost_local": total_cost,
            "local_currency": pos.local_currency,
            "current_price": current_price,
            "current_value_pln": current_value_pln,
            "unrealized_pln": unrealized_pln,
            "unrealized_pct": float(pos.unrealized_pct or 0),
            "last_price_update": pos.last_price_update.isoformat() if pos.last_price_update else None,
        })

    return result
