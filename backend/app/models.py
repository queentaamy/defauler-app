import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Case(Base):
    __tablename__ = "cases"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_number = Column(String(100), nullable=False, index=True)
    court_name = Column(String(200), nullable=True)
    
    # Fixed Plaintiff Information
    plaintiff_name = Column(String(200), nullable=False)
    plaintiff_address = Column(Text, nullable=True)
    plaintiff_contact = Column(String(100), nullable=True)

    # Defendant Information
    defendant_name = Column(String(200), nullable=False, index=True)
    defendant_address = Column(Text, nullable=True)
    defendant_contact = Column(String(100), nullable=True)

    # Overall Status: 'active', 'overdue', 'defaulted', 'settled'
    status = Column(String(50), default="active", nullable=False)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    agreements = relationship("Agreement", back_populates="case", cascade="all, delete-orphan")
    payment_plan_items = relationship("PaymentPlanItem", back_populates="case", cascade="all, delete-orphan", order_by="PaymentPlanItem.instalment_number")
    payments = relationship("Payment", back_populates="case", cascade="all, delete-orphan", order_by="Payment.payment_date.desc()")
    calculation_records = relationship("CalculationRecord", back_populates="case", cascade="all, delete-orphan", order_by="CalculationRecord.calculation_date.desc()")

class Agreement(Base):
    __tablename__ = "agreements"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    
    document_name = Column(String(255), nullable=True)
    document_type = Column(String(50), nullable=True)
    file_path = Column(Text, nullable=True)

    original_amount = Column(Float, nullable=False, default=0.0)
    currency = Column(String(10), nullable=False, default="USD")
    payment_amount = Column(Float, nullable=False, default=0.0)
    frequency = Column(String(50), nullable=False, default="monthly") # monthly, weekly, biweekly, lump_sum
    start_date = Column(Date, nullable=False)
    instalments_count = Column(Integer, nullable=False, default=1)
    
    # Financial Terms
    interest_rate = Column(Float, nullable=False, default=0.0) # Annual %
    penalty_rate_or_fixed = Column(Float, nullable=False, default=0.0)
    penalty_type = Column(String(50), nullable=False, default="none") # none, percentage, fixed_fee, per_day
    grace_period_days = Column(Integer, nullable=False, default=0)
    default_conditions = Column(Text, nullable=True)
    
    # Multi-currency rules
    exchange_rate_rule = Column(Text, nullable=True)
    exchange_rate = Column(Float, nullable=False, default=1.0)
    target_currency = Column(String(10), nullable=True)

    extracted_raw_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    case = relationship("Case", back_populates="agreements")

class PaymentPlanItem(Base):
    __tablename__ = "payment_plans"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    
    instalment_number = Column(Integer, nullable=False)
    due_date = Column(Date, nullable=False)
    amount_due = Column(Float, nullable=False, default=0.0)
    amount_paid = Column(Float, nullable=False, default=0.0)
    
    # Status: 'upcoming', 'paid', 'partially_paid', 'overdue', 'defaulted'
    status = Column(String(50), nullable=False, default="upcoming")
    paid_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)

    case = relationship("Case", back_populates="payment_plan_items")

class Payment(Base):
    __tablename__ = "payments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    payment_plan_id = Column(String(36), ForeignKey("payment_plans.id", ondelete="SET NULL"), nullable=True)
    
    amount = Column(Float, nullable=False)
    payment_date = Column(Date, nullable=False)
    currency = Column(String(10), nullable=False, default="USD")
    payment_reference = Column(String(100), nullable=False)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    case = relationship("Case", back_populates="payments")

class CalculationRecord(Base):
    __tablename__ = "calculation_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    
    calculation_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    original_amount = Column(Float, nullable=False)
    total_paid = Column(Float, nullable=False)
    outstanding_principal = Column(Float, nullable=False)
    accrued_interest = Column(Float, nullable=False)
    default_interest_or_penalty = Column(Float, nullable=False)
    exchange_rate = Column(Float, nullable=False, default=1.0)
    currency = Column(String(10), nullable=False)
    target_currency = Column(String(10), nullable=True)
    total_amount_owed = Column(Float, nullable=False)
    
    breakdown_json = Column(Text, nullable=False)

    case = relationship("Case", back_populates="calculation_records")
