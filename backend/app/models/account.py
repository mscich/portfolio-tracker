from sqlalchemy import Column, String, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin, gen_uuid


class Account(Base, TimestampMixin):
    __tablename__ = "accounts"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    account_number = Column(String(50), unique=True, nullable=False)
    currency = Column(String(3), nullable=False)  # PLN, EUR, USD
    label = Column(String(100), nullable=True)
    broker = Column(String(50), nullable=True, default="XTB")
    is_active = Column(Boolean, default=True)

    transactions = relationship("Transaction", back_populates="account")
    open_positions = relationship("OpenPosition", back_populates="account")
    dividends = relationship("Dividend", back_populates="account")
    closed_positions = relationship("ClosedPosition", back_populates="account")
