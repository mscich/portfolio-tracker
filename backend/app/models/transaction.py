from sqlalchemy import Column, String, Integer, Numeric, BigInteger, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin, gen_uuid


class Transaction(Base, TimestampMixin):
    __tablename__ = "transactions"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    account_id = Column(UUID(as_uuid=False), ForeignKey("accounts.id"), nullable=False)
    instrument_id = Column(UUID(as_uuid=False), ForeignKey("instruments.id"), nullable=False)

    # "Stock purchase" | "Stock sell"
    type = Column(String(30), nullable=False)

    quantity = Column(Integer, nullable=False)           # zawsze dodatnia
    direction = Column(String(4), nullable=False)        # "BUY" | "SELL"
    price = Column(Numeric(18, 6), nullable=False)       # cena jednostkowa w walucie rachunku
    amount_local = Column(Numeric(18, 4), nullable=False)# kwota w walucie rachunku (ujemna=wydatek)
    local_currency = Column(String(3), nullable=False)

    fx_rate = Column(Numeric(18, 6), nullable=True)      # kurs do PLN w dniu transakcji
    amount_pln = Column(Numeric(18, 4), nullable=True)   # przeliczone na PLN

    external_id = Column(BigInteger, nullable=True)      # ID z XTB (jeśli dostępne)
    comment = Column(Text, nullable=True)                # surowy komentarz z XTB
    executed_at = Column(DateTime(timezone=True), nullable=False)

    account = relationship("Account", back_populates="transactions")
    instrument = relationship("Instrument", back_populates="transactions")
