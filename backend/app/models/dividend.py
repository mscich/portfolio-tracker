from sqlalchemy import Column, String, Numeric, BigInteger, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin, gen_uuid


class Dividend(Base, TimestampMixin):
    __tablename__ = "dividends"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    account_id = Column(UUID(as_uuid=False), ForeignKey("accounts.id"), nullable=False)
    instrument_id = Column(UUID(as_uuid=False), ForeignKey("instruments.id"), nullable=False)

    # "Dividend" | "Withholding tax" | "Dividend equivalent"
    type = Column(String(30), nullable=False)

    amount_local = Column(Numeric(18, 4), nullable=False)   # w walucie rachunku
    local_currency = Column(String(3), nullable=False)
    amount_pln = Column(Numeric(18, 4), nullable=True)      # przeliczone na PLN
    fx_rate = Column(Numeric(18, 6), nullable=True)         # kurs NBP z dnia wypłaty

    per_share = Column(Numeric(18, 6), nullable=True)       # dywidenda/akcję (z komentarza XTB)
    per_share_currency = Column(String(3), nullable=True)   # waluta dywidendy/akcję

    external_id = Column(BigInteger, nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=False)

    account = relationship("Account", back_populates="dividends")
    instrument = relationship("Instrument", back_populates="dividends")
