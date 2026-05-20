from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin, gen_uuid


class Instrument(Base, TimestampMixin):
    __tablename__ = "instruments"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    ticker = Column(String(30), unique=True, nullable=False)  # np. IEDY.UK, XGSD.DE
    name = Column(String(200), nullable=True)                 # pełna nazwa
    category = Column(String(50), nullable=True)              # ETF, Stock, Bond, etc.
    exchange = Column(String(30), nullable=True)              # LSE, XETRA, GPW
    currency = Column(String(3), nullable=True)               # waluta notowania
    isin = Column(String(12), nullable=True)
    yf_ticker = Column(String(30), nullable=True)             # ticker dla Yahoo Finance (może się różnić)
    price_updated_at = Column(DateTime(timezone=True), nullable=True)

    transactions = relationship("Transaction", back_populates="instrument")
    open_positions = relationship("OpenPosition", back_populates="instrument")
    dividends = relationship("Dividend", back_populates="instrument")
    closed_positions = relationship("ClosedPosition", back_populates="instrument")
    price_history = relationship("PriceHistory", back_populates="instrument")
