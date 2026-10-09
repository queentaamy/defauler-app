import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, Date, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Case(Base):
    __tablename__ = "cases"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_number = Column(String(100), nullable=False, index=True)
    court_name = Column(String(200), nullable=True)
    
    # Account Type: 'settlement' (Discounted agreement + checkpoints + reinstatement) or 'judgment_debt' (Court order + variable interest + ledger)
    account_type = Column(String(50), default="settlement", nullable=False)
    
    # Fixed Plaintiff Information
    plaintiff_name = Column(String(200), nullable=False)
    plaintiff_address = Column(Text, nullable=True)
    plaintiff_contact = Column(String(100), nullable=True)

    # Defendant Information
    defendant_name = Column(String(200), nullable=False, index=True)
    defendant_address = Column(Text, nullable=True)
    defendant_contact = Column(String(100), nullable=True)

    # Common Financial fields
    currency = Column(String(10), default="USD", nullable=False)
    
    # Settlement Account Specific Fields
    settlement_total = Column(Float, nullable=True) # The discounted payoff amount (e.g. $6,000,000.00)
    reinstatement_amount = Column(Float, nullable=True) # Full debt if broken (e.g. $8,256,340.67)
    reinstatement_interest_rate = Column(Float, nullable=True, default=0.0) # Annual % (e.g. 12%)
    interest_accrual_start_date = Column(Date, nullable=True)
    is_breached = Column(Boolean, default=False, nullable=False)
    breached_date = Column(Date, nullable=True)
    breached_reason = Column(Text, nullable=True)

    # Judgment Debt Account Specific Fields
    judgment_date = Column(Date, nullable=True)
    cost_awarded = Column(Float, default=0.0, nullable=False)
    interest_method = Column(String(50), default="simple_30_360", nullable=False) # 'simple_30_360', 'simple_actual_365', 'compound'

    # Overall Status: 'active', 'overdue', 'defaulted', 'breached', 'settled', 'archived'
    status = Column(String(50), default="active", nullable=False)
    is_archived = Column(Boolean, default=False, nullable=False)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    agreements = relationship("Agreement", back_populates="case", cascade="all, delete-orphan")
    payment_plan_items = relationship("PaymentPlanItem", back_populates="case", cascade="all, delete-orphan", order_by="PaymentPlanItem.instalment_number")
    checkpoints = relationship("PaymentCheckpoint", back_populates="case", cascade="all, delete-orphan", order_by="PaymentCheckpoint.checkpoint_number")
    interest_tranches = relationship("InterestRateTranche", back_populates="case", cascade="all, delete-orphan", order_by="InterestRateTranche.effective_from.asc()")
    currency_gain_losses = relationship("CurrencyGainLossItem", back_populates="case", cascade="all, delete-orphan", order_by="CurrencyGainLossItem.obligation_due_date.asc()")
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

class PaymentCheckpoint(Base):
    """
    Cumulative payment checkpoint milestone for settlement accounts.
    Matches the reference schedule: 'Each row is a date by which a cumulative total must have been paid'.
    """
    __tablename__ = "payment_checkpoints"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    
    checkpoint_number = Column(Integer, nullable=False)
    due_date = Column(Date, nullable=False)
    cumulative_required = Column(Float, nullable=False, default=0.0) # Cumulative target by this date
    amount_required = Column(Float, nullable=False, default=0.0) # Periodic amount required
    actually_paid_by_then = Column(Float, nullable=False, default=0.0)
    
    # Status: 'met', 'missed', 'on_track', 'not_due'
    status = Column(String(50), nullable=False, default="not_due")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    case = relationship("Case", back_populates="checkpoints")

class InterestRateTranche(Base):
    """
    Historical variable interest rate tranches for court orders and judgment debts.
    Columns: Effective from | Base rate (%) | Spread (%) | Penal rate (%) | All-in (%)
    """
    __tablename__ = "interest_rate_tranches"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    
    effective_from = Column(Date, nullable=False)
    base_rate = Column(Float, nullable=False, default=0.0)
    spread = Column(Float, nullable=False, default=0.0)
    penal_rate = Column(Float, nullable=False, default=0.0)
    all_in_rate = Column(Float, nullable=False, default=0.0) # base_rate + spread + penal_rate
    
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    case = relationship("Case", back_populates="interest_tranches")

class CurrencyGainLossItem(Base):
    """
    Currency gain/loss on payments: compares payment in local currency (e.g. GHS Cedis)
    converted to contract currency (e.g. USD) at payment date rate vs. due date rate.
    """
    __tablename__ = "currency_gain_loss_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    payment_id = Column(String(36), ForeignKey("payments.id", ondelete="SET NULL"), nullable=True)
    
    obligation_due_date = Column(Date, nullable=False)
    amount_contract_curr = Column(Float, nullable=False, default=0.0)
    payment_date = Column(Date, nullable=False)
    due_date_rate = Column(Float, nullable=False, default=1.0)
    actual_payment_rate = Column(Float, nullable=False, default=1.0)
    local_currency_impact = Column(Float, nullable=False, default=0.0)
    local_currency = Column(String(10), default="GHS", nullable=False)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    case = relationship("Case", back_populates="currency_gain_losses")

class Payment(Base):
    __tablename__ = "payments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    payment_plan_id = Column(String(36), ForeignKey("payment_plans.id", ondelete="SET NULL"), nullable=True)
    checkpoint_id = Column(String(36), ForeignKey("payment_checkpoints.id", ondelete="SET NULL"), nullable=True)
    
    amount = Column(Float, nullable=False)
    payment_date = Column(Date, nullable=False)
    currency = Column(String(10), nullable=False, default="USD")
    payment_reference = Column(String(100), nullable=False)
    
    # Optional multi-currency details
    local_amount_paid = Column(Float, nullable=True)
    local_currency = Column(String(10), nullable=True)
    exchange_rate_applied = Column(Float, nullable=True)
    
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    case = relationship("Case", back_populates="payments")

class CalculationRecord(Base):
    __tablename__ = "calculation_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    
    calculation_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    as_of_date = Column(Date, nullable=True)
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
