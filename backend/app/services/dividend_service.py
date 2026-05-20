"""
Serwis dywidend — podsumowania per rok, ticker, konto.
"""
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import extract, func, case
from app.models import Dividend, Instrument, Account


def get_dividends_by_year(db: Session) -> list[dict]:
    """
    Podsumowanie dywidend per rok (wszystkie konta razem, w PLN).
    Rozdziela brutto / podatek / netto.
    """
    rows = (
        db.query(
            extract("year", Dividend.paid_at).label("year"),
            func.sum(
                case((Dividend.type == "Dividend", Dividend.amount_pln), else_=0)
            ).label("gross_pln"),
            func.sum(
                case((Dividend.type == "Withholding tax", Dividend.amount_pln), else_=0)
            ).label("tax_pln"),
            func.sum(
                case((Dividend.type == "Dividend equivalent", Dividend.amount_pln), else_=0)
            ).label("equivalent_pln"),
            func.sum(Dividend.amount_pln).label("total_pln"),
            func.count(
                case((Dividend.type == "Dividend", 1))
            ).label("payment_count"),
        )
        .group_by(extract("year", Dividend.paid_at))
        .order_by(extract("year", Dividend.paid_at))
        .all()
    )

    result = []
    for r in rows:
        gross = float(r.gross_pln or 0)
        tax = float(r.tax_pln or 0)
        equivalent = float(r.equivalent_pln or 0)
        net = gross + tax + equivalent  # tax jest ujemny

        result.append({
            "year": int(r.year),
            "gross_pln": round(gross, 2),
            "tax_pln": round(tax, 2),
            "equivalent_pln": round(equivalent, 2),
            "net_pln": round(net, 2),
            "payment_count": r.payment_count,
        })

    return result


def get_dividends_by_ticker_and_year(db: Session) -> list[dict]:
    """
    Podsumowanie dywidend per ticker per rok — do heatmapy i tabelki.
    """
    rows = (
        db.query(
            extract("year", Dividend.paid_at).label("year"),
            Instrument.ticker,
            Instrument.name,
            func.sum(
                case((Dividend.type == "Dividend", Dividend.amount_pln), else_=0)
            ).label("gross_pln"),
            func.sum(
                case((Dividend.type == "Withholding tax", Dividend.amount_pln), else_=0)
            ).label("tax_pln"),
            func.count(
                case((Dividend.type == "Dividend", 1))
            ).label("payment_count"),
        )
        .join(Instrument, Dividend.instrument_id == Instrument.id)
        .filter(Dividend.type.in_(["Dividend", "Withholding tax", "Dividend equivalent"]))
        .group_by(
            extract("year", Dividend.paid_at),
            Instrument.ticker,
            Instrument.name,
        )
        .order_by(
            extract("year", Dividend.paid_at),
            func.sum(Dividend.amount_pln).desc(),
        )
        .all()
    )

    return [
        {
            "year": int(r.year),
            "ticker": r.ticker,
            "name": r.name,
            "gross_pln": round(float(r.gross_pln or 0), 2),
            "tax_pln": round(float(r.tax_pln or 0), 2),
            "net_pln": round(float((r.gross_pln or 0) + (r.tax_pln or 0)), 2),
            "payment_count": r.payment_count,
        }
        for r in rows
    ]


def get_dividends_by_account(db: Session, year: int | None = None) -> list[dict]:
    """
    Podsumowanie dywidend per konto per rok — brutto/podatek/netto
    w walucie rachunku ORAZ w PLN.
    """
    query = (
        db.query(
            extract("year", Dividend.paid_at).label("year"),
            Account.account_number,
            Account.currency,
            func.sum(
                case((Dividend.type == "Dividend", Dividend.amount_local), else_=0)
            ).label("gross_local"),
            func.sum(
                case((Dividend.type == "Withholding tax", Dividend.amount_local), else_=0)
            ).label("tax_local"),
            func.sum(
                case((Dividend.type == "Dividend equivalent", Dividend.amount_local), else_=0)
            ).label("equivalent_local"),
            func.sum(
                case((Dividend.type == "Dividend", Dividend.amount_pln), else_=0)
            ).label("gross_pln"),
            func.sum(
                case((Dividend.type == "Withholding tax", Dividend.amount_pln), else_=0)
            ).label("tax_pln"),
            func.sum(
                case((Dividend.type == "Dividend equivalent", Dividend.amount_pln), else_=0)
            ).label("equivalent_pln"),
            func.count(
                case((Dividend.type == "Dividend", 1))
            ).label("payment_count"),
        )
        .join(Account, Dividend.account_id == Account.id)
        .filter(Dividend.type.in_(["Dividend", "Withholding tax", "Dividend equivalent"]))
    )

    if year:
        query = query.filter(extract("year", Dividend.paid_at) == year)

    rows = (
        query
        .group_by(
            extract("year", Dividend.paid_at),
            Account.account_number,
            Account.currency,
        )
        .order_by(
            extract("year", Dividend.paid_at),
            Account.account_number,
        )
        .all()
    )

    return [
        {
            "year": int(r.year),
            "account_number": r.account_number,
            "currency": r.currency,
            "gross_local": round(float(r.gross_local or 0), 2),
            "tax_local": round(float(r.tax_local or 0), 2),
            "equivalent_local": round(float(r.equivalent_local or 0), 2),
            "net_local": round(
                float((r.gross_local or 0) + (r.tax_local or 0) + (r.equivalent_local or 0)), 2
            ),
            "gross_pln": round(float(r.gross_pln or 0), 2),
            "tax_pln": round(float(r.tax_pln or 0), 2),
            "net_pln": round(
                float((r.gross_pln or 0) + (r.tax_pln or 0) + (r.equivalent_pln or 0)), 2
            ),
            "payment_count": r.payment_count,
        }
        for r in rows
    ]


def get_dividends_monthly(db: Session, year: int | None = None) -> list[dict]:
    """
    Dywidendy per miesiąc — do wykresu słupkowego.
    """
    query = (
        db.query(
            extract("year", Dividend.paid_at).label("year"),
            extract("month", Dividend.paid_at).label("month"),
            func.sum(
                case((Dividend.type == "Dividend", Dividend.amount_pln), else_=0)
            ).label("gross_pln"),
            func.sum(
                case((Dividend.type == "Withholding tax", Dividend.amount_pln), else_=0)
            ).label("tax_pln"),
        )
        .filter(Dividend.type.in_(["Dividend", "Withholding tax"]))
    )

    if year:
        query = query.filter(extract("year", Dividend.paid_at) == year)

    rows = (
        query
        .group_by(
            extract("year", Dividend.paid_at),
            extract("month", Dividend.paid_at),
        )
        .order_by(
            extract("year", Dividend.paid_at),
            extract("month", Dividend.paid_at),
        )
        .all()
    )

    months_pl = [
        "", "Sty", "Lut", "Mar", "Kwi", "Maj", "Cze",
        "Lip", "Sie", "Wrz", "Paź", "Lis", "Gru"
    ]

    return [
        {
            "year": int(r.year),
            "month": int(r.month),
            "month_label": f"{months_pl[int(r.month)]} {int(r.year)}",
            "gross_pln": round(float(r.gross_pln or 0), 2),
            "tax_pln": round(float(r.tax_pln or 0), 2),
            "net_pln": round(float((r.gross_pln or 0) + (r.tax_pln or 0)), 2),
        }
        for r in rows
    ]
