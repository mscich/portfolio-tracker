from sqlalchemy import Column, String, Integer, Numeric, Date, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin, gen_uuid


class ClosedPosition(Base, TimestampMixin):
    __tablename__ = "closed_positions"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    account_id = Column(UUID(as_uuid=False), ForeignKey("accounts.id"), nullable=False)
    instrument_id = Column(UUID(as_uuid=False), ForeignKey("instruments.id"), nullable=False)

    volume = Column(Integer, nullable=False)
    open_price = Column(Numeric(18, 6), nullable=False)
    close_price = Column(Numeric(18, 6), nullable=False)
    profit_loss = Column(Numeric(18, 4), nullable=False)   # w walucie rachunku
    profit_loss_pln = Column(Numeric(18, 4), nullable=True)
    commission = Column(Numeric(18, 4), nullable=True)

    opened_at = Column(DateTime(timezone=True), nullable=False)
    closed_at = Column(DateTime(timezone=True), nullable=False)

    account = relationship("Account", back_populates="closed_positions")
    instrument = relationship("Instrument", back_populates="closed_positions")


class PriceHistory(Base):
    __tablename__ = "price_history"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    instrument_id = Column(UUID(as_uuid=False), ForeignKey("instruments.id"), nullable=False)
    price = Column(Numeric(18, 6), nullable=False)
    currency = Column(String(3), nullable=False)
    price_date = Column(Date, nullable=False)

    instrument = relationship("Instrument", back_populates="price_history")


class FxRate(Base):
    __tablename__ = "fx_rates"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    from_currency = Column(String(3), nullable=False)
    to_currency = Column(String(3), nullable=False)
    rate = Column(Numeric(18, 6), nullable=False)
    rate_date = Column(Date, nullable=False)
    source = Column(String(20), nullable=True, default="NBP")
