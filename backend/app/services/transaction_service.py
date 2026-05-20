from sqlalchemy.orm import Session
from app.models import Transaction, Instrument, Account


def get_transactions(db: Session, type_filter: str | None = None) -> list[dict]:
    query = (
        db.query(
            Transaction.id,
            Transaction.type,
            Transaction.direction,
            Transaction.quantity,
            Transaction.price,
            Transaction.amount_local,
            Transaction.local_currency,
            Transaction.amount_pln,
            Transaction.fx_rate,
            Transaction.executed_at,
            Account.account_number,
            Account.currency.label("account_currency"),
            Instrument.ticker,
            Instrument.name,
            Instrument.exchange,
        )
        .join(Account, Transaction.account_id == Account.id)
        .join(Instrument, Transaction.instrument_id == Instrument.id)
    )

    if type_filter:
        query = query.filter(Transaction.type == type_filter)

    rows = query.order_by(Transaction.executed_at.desc()).all()

    return [
        {
            "id": r.id,
            "executed_at": r.executed_at.isoformat(),
            "type": r.type,
            "direction": r.direction,
            "ticker": r.ticker,
            "name": r.name,
            "exchange": r.exchange,
            "quantity": r.quantity,
            "price": float(r.price),
            "amount_local": float(r.amount_local),
            "local_currency": r.local_currency,
            "amount_pln": float(r.amount_pln) if r.amount_pln is not None else None,
            "fx_rate": float(r.fx_rate) if r.fx_rate is not None else None,
            "account_number": r.account_number,
            "account_currency": r.account_currency,
        }
        for r in rows
    ]


def get_transaction_types(db: Session) -> list[str]:
    rows = db.query(Transaction.type).distinct().order_by(Transaction.type).all()
    return [r.type for r in rows]
