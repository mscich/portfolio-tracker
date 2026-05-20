"""
XTB Export Importer
-------------------
Importuje dane z eksportu XTB (Cash Operations + Closed Positions).

Kluczowe: XTB używa "CLOSE BUY" w komentarzach do sprzedaży,
nie "CLOSE SELL" — obsługujemy oba warianty.
"""
import re
import logging
from pathlib import Path
from datetime import datetime, date
from decimal import Decimal, InvalidOperation
from typing import Optional

import pandas as pd
from sqlalchemy.orm import Session

from app.models import Account, Instrument, Transaction, Dividend, ClosedPosition
from app.services.fx_service import get_or_fetch_fx_rate

logger = logging.getLogger(__name__)

# Mapowanie tickerów XTB → Yahoo Finance
YF_TICKER_MAP = {
    "IEDY.UK":   "IEDY.L",
    "XGSD.DE":   "XGSD.DE",
    "SXEPEX.DE": "SXEPEX.DE",
    "IDUS.UK":   "IDUS.L",
    "VHYD.UK":   "VHYD.L",
    "TDIV.NL":   "TDIV.AS",
    "SDGPEX.DE": "SDGPEX.DE",
    "QYLD.UK":   "QYLD.L",
    "QYLE.DE":   "QYLE.DE",
    "UDIV.DE":   "UDIV.DE",
    "STX.PL":    "STX.WA",
    "TEN.PL":    "TEN.WA",
    "BNPPPL.PL": "BNP.WA",
}


def parse_qty_from_comment(comment: str) -> tuple[int, str]:
    """
    Wyciąga ilość i kierunek z komentarza XTB.

    Formaty:
      OPEN BUY 20 @ 17.295        → (20, BUY)
      OPEN BUY 43/50 @ 15.110     → (43, BUY)
      CLOSE BUY 10/28 @ 14.230    → (10, SELL)   ← uwaga: CLOSE BUY = sprzedaż!
      CLOSE SELL 10 @ 14.230      → (10, SELL)
    """
    if not comment or pd.isna(comment):
        return 0, "UNKNOWN"

    comment = str(comment).strip()

    # OPEN BUY — zakup
    m = re.search(r"OPEN BUY\s+(\d+)(?:/\d+)?", comment)
    if m:
        return int(m.group(1)), "BUY"

    # CLOSE BUY lub CLOSE SELL — sprzedaż (XTB używa CLOSE BUY dla pozycji long)
    m = re.search(r"CLOSE (?:BUY|SELL)\s+(\d+)(?:/\d+)?", comment)
    if m:
        return int(m.group(1)), "SELL"

    return 0, "UNKNOWN"


def parse_per_share(comment: str) -> tuple[Optional[Decimal], Optional[str]]:
    """
    Wyciąga dywidendę na akcję z komentarza.
    Format: "IEDY.UK USD 0.1717/ SHR"
    """
    if not comment or pd.isna(comment):
        return None, None
    m = re.search(r"([A-Z]{3})\s+([\d.]+)/\s*SHR", str(comment))
    if m:
        return Decimal(m.group(2)), m.group(1)
    return None, None


def to_decimal(val) -> Optional[Decimal]:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    try:
        return Decimal(str(val))
    except InvalidOperation:
        return None


def get_or_create_account(db: Session, account_number: str, currency: str) -> Account:
    acc = db.query(Account).filter_by(account_number=account_number).first()
    if not acc:
        acc = Account(
            account_number=account_number,
            currency=currency,
            label=f"XTB {currency} ({account_number})",
            broker="XTB",
        )
        db.add(acc)
        db.flush()
        logger.info(f"Utworzono konto: {account_number} ({currency})")
    return acc


def get_or_create_instrument(db: Session, ticker: str, name: str) -> Instrument:
    inst = db.query(Instrument).filter_by(ticker=ticker).first()
    if not inst:
        # Zgadnij exchange z suffixu tickera
        suffix_map = {
            ".UK": "LSE", ".DE": "XETRA", ".NL": "AEX",
            ".PL": "GPW", ".US": "NYSE",
        }
        exchange = next(
            (v for k, v in suffix_map.items() if ticker.endswith(k)), None
        )
        inst = Instrument(
            ticker=ticker,
            name=name,
            exchange=exchange,
            yf_ticker=YF_TICKER_MAP.get(ticker),
        )
        db.add(inst)
        db.flush()
        logger.info(f"Utworzono instrument: {ticker} ({name})")
    return inst


def import_cash_operations(
    db: Session,
    df: pd.DataFrame,
    account: Account,
) -> dict:
    """Importuje transakcje i dywidendy z arkusza Cash Operations."""
    stats = {"transactions": 0, "dividends": 0, "skipped": 0, "errors": 0}

    for _, row in df.iterrows():
        op_type = str(row.get("Type", "")).strip()
        ticker = str(row.get("Ticker", "")).strip()
        instrument_name = str(row.get("Instrument", "")).strip()
        amount = to_decimal(row.get("Amount"))
        comment = row.get("Comment", "")
        executed_at = row.get("Time")

        if not ticker or ticker == "nan" or amount is None:
            stats["skipped"] += 1
            continue

        if isinstance(executed_at, str):
            try:
                executed_at = datetime.fromisoformat(executed_at)
            except ValueError:
                stats["errors"] += 1
                continue

        try:
            instrument = get_or_create_instrument(db, ticker, instrument_name)

            # --- TRANSAKCJE ---
            if op_type in ("Stock purchase", "Stock sell"):
                qty, direction = parse_qty_from_comment(comment)
                if qty == 0:
                    logger.warning(f"Nie można sparsować ilości: {comment}")
                    stats["errors"] += 1
                    continue

                # Szukaj czy już istnieje (dedup po dacie + ticker + amount)
                existing = db.query(Transaction).filter_by(
                    account_id=account.id,
                    instrument_id=instrument.id,
                    amount_local=amount,
                    executed_at=executed_at,
                ).first()
                if existing:
                    stats["skipped"] += 1
                    continue

                # Cena jednostkowa z komentarza
                price_match = re.search(r"@\s*([\d.]+)", str(comment))
                price = Decimal(price_match.group(1)) if price_match else abs(amount) / qty

                # Kurs FX do PLN
                fx_rate = None
                amount_pln = None
                if account.currency != "PLN" and executed_at:
                    fx_rate = get_or_fetch_fx_rate(
                        db, account.currency, "PLN", executed_at.date()
                    )
                    if fx_rate:
                        amount_pln = amount * fx_rate
                else:
                    amount_pln = amount

                txn = Transaction(
                    account_id=account.id,
                    instrument_id=instrument.id,
                    type=op_type,
                    quantity=qty,
                    direction=direction,
                    price=price,
                    amount_local=amount,
                    local_currency=account.currency,
                    fx_rate=fx_rate,
                    amount_pln=amount_pln,
                    comment=str(comment),
                    executed_at=executed_at,
                )
                db.add(txn)
                stats["transactions"] += 1

            # --- DYWIDENDY ---
            elif op_type in ("Dividend", "Withholding tax", "Dividend equivalent"):
                existing = db.query(Dividend).filter_by(
                    account_id=account.id,
                    instrument_id=instrument.id,
                    amount_local=amount,
                    paid_at=executed_at,
                ).first()
                if existing:
                    stats["skipped"] += 1
                    continue

                per_share, per_share_currency = parse_per_share(comment)

                fx_rate = None
                amount_pln = None
                if account.currency != "PLN" and executed_at:
                    fx_rate = get_or_fetch_fx_rate(
                        db, account.currency, "PLN", executed_at.date()
                    )
                    if fx_rate:
                        amount_pln = amount * fx_rate
                else:
                    amount_pln = amount

                div = Dividend(
                    account_id=account.id,
                    instrument_id=instrument.id,
                    type=op_type,
                    amount_local=amount,
                    local_currency=account.currency,
                    amount_pln=amount_pln,
                    fx_rate=fx_rate,
                    per_share=per_share,
                    per_share_currency=per_share_currency,
                    paid_at=executed_at,
                )
                db.add(div)
                stats["dividends"] += 1

        except Exception as e:
            logger.error(f"Błąd przy {ticker} / {op_type}: {e}")
            stats["errors"] += 1
            continue

    return stats


def import_closed_positions(
    db: Session,
    df: pd.DataFrame,
    account: Account,
) -> dict:
    """Importuje zamknięte pozycje z arkusza Closed Positions."""
    stats = {"closed": 0, "skipped": 0, "errors": 0}

    for _, row in df.iterrows():
        ticker = str(row.get("Ticker", "")).strip()
        instrument_name = str(row.get("Instrument", "")).strip()

        if not ticker or ticker == "nan":
            stats["skipped"] += 1
            continue

        try:
            instrument = get_or_create_instrument(db, ticker, instrument_name)

            open_time = row.get("Open Time (UTC)")
            close_time = row.get("Close Time (UTC)")
            open_price = to_decimal(row.get("Open Price"))
            close_price = to_decimal(row.get("Close Price"))
            volume = int(row.get("Volume", 0))
            profit_loss = to_decimal(row.get("Profit/Loss"))
            commission = to_decimal(row.get("Commission"))

            if not all([open_price, close_price, volume]):
                stats["skipped"] += 1
                continue

            # Dedup
            existing = db.query(ClosedPosition).filter_by(
                account_id=account.id,
                instrument_id=instrument.id,
                open_price=open_price,
                close_price=close_price,
                opened_at=open_time,
                closed_at=close_time,
            ).first()
            if existing:
                stats["skipped"] += 1
                continue

            # P&L w PLN
            profit_loss_pln = None
            if account.currency != "PLN" and close_time and profit_loss:
                fx_rate = get_or_fetch_fx_rate(
                    db, account.currency, "PLN",
                    close_time.date() if hasattr(close_time, "date") else close_time
                )
                if fx_rate:
                    profit_loss_pln = profit_loss * fx_rate
            else:
                profit_loss_pln = profit_loss

            cp = ClosedPosition(
                account_id=account.id,
                instrument_id=instrument.id,
                volume=volume,
                open_price=open_price,
                close_price=close_price,
                profit_loss=profit_loss or Decimal("0"),
                profit_loss_pln=profit_loss_pln,
                commission=commission,
                opened_at=open_time,
                closed_at=close_time,
            )
            db.add(cp)
            stats["closed"] += 1

        except Exception as e:
            logger.error(f"Błąd przy zamkniętej pozycji {ticker}: {e}")
            stats["errors"] += 1

    return stats


def import_xtb_file(
    db: Session,
    file_path: str | Path,
    account_number: str,
    currency: str,
) -> dict:
    """
    Główna funkcja importu jednego pliku XTB.
    Wywołaj dla każdego z 3 plików (PLN, EUR, USD).
    """
    logger.info(f"Importuję {file_path} → konto {account_number} ({currency})")

    xl = pd.ExcelFile(file_path)
    account = get_or_create_account(db, account_number, currency)

    results = {"account": account_number, "currency": currency}

    # Cash Operations
    if "Cash Operations" in xl.sheet_names:
        df_cash = pd.read_excel(xl, sheet_name="Cash Operations", header=4)
        df_cash.columns = df_cash.columns.str.strip()
        stats = import_cash_operations(db, df_cash, account)
        results["cash_operations"] = stats
        logger.info(f"  Cash Operations: {stats}")

    # Closed Positions
    if "Closed Positions" in xl.sheet_names:
        df_closed = pd.read_excel(xl, sheet_name="Closed Positions", header=4)
        df_closed.columns = df_closed.columns.str.strip()
        stats = import_closed_positions(db, df_closed, account)
        results["closed_positions"] = stats
        logger.info(f"  Closed Positions: {stats}")

    db.commit()
    logger.info(f"Import {account_number} zakończony ✓")
    return results


def import_all_accounts(db: Session, data_dir: str | Path) -> list[dict]:
    """
    Importuje wszystkie 3 pliki XTB z katalogu.
    Oczekuje plików: PLN_*.xlsx, EUR_*.xlsx, USD_*.xlsx
    """
    data_dir = Path(data_dir)
    files = [
        ("PLN", next(data_dir.glob("PLN_*.xlsx"), None)),
        ("EUR", next(data_dir.glob("EUR_*.xlsx"), None)),
        ("USD", next(data_dir.glob("USD_*.xlsx"), None)),
    ]

    results = []
    for currency, path in files:
        if not path:
            logger.warning(f"Brak pliku {currency}_*.xlsx w {data_dir}")
            continue

        # Wyciągnij numer konta z nazwy pliku: PLN_2017627_...xlsx → 2017627
        account_number = path.stem.split("_")[1]
        result = import_xtb_file(db, path, account_number, currency)
        results.append(result)

    return results
