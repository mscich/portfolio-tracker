from sqlalchemy import Column, Integer, Numeric, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin, gen_uuid


class OpenPosition(Base, TimestampMixin):
    __tablename__ = "open_positions"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    account_id = Column(UUID(as_uuid=False), ForeignKey("accounts.id"), nullable=False)
    instrument_id = Column(UUID(as_uuid=False), ForeignKey("instruments.id"), nullable=False)

    quantity = Column(Integer, nullable=False)

    # Koszt nabycia (średni ważony)
    avg_cost_price = Column(Numeric(18, 6), nullable=False)     # w walucie rachunku
    total_cost_local = Column(Numeric(18, 4), nullable=False)   # quantity * avg_cost_price
    local_currency = Column(String(3), nullable=True)   # ← dodaj tę linię

    # Wartość bieżąca (aktualizowana przez serwis cen)
    current_price = Column(Numeric(18, 6), nullable=True)
    current_price_currency = Column(String(3), nullable=True)
    current_value_local = Column(Numeric(18, 4), nullable=True)
    current_value_pln = Column(Numeric(18, 4), nullable=True)

    # P&L
    unrealized_pln = Column(Numeric(18, 4), nullable=True)
    unrealized_pct = Column(Numeric(8, 4), nullable=True)

    last_price_update = Column(DateTime(timezone=True), nullable=True)

    account = relationship("Account", back_populates="open_positions")
    instrument = relationship("Instrument", back_populates="open_positions")
