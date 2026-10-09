from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import date, datetime

class ExtractedAgreementData(BaseModel):
    case_number: str = ""
    court_name: Optional[str] = ""
    
    # Defendant Details
    defendant_name: str = ""
    defendant_address: Optional[str] = ""
    defendant_contact: Optional[str] = ""
    
    # Financial & Schedule Details
    original_amount: float = 0.0
    currency: str = "USD"
    payment_amount: float = 0.0
    frequency: str = "monthly"  # monthly, weekly, biweekly, lump_sum
    start_date: str = ""        # YYYY-MM-DD
    instalments_count: int = 1
    interest_rate: float = 0.0  # Annual percentage
    penalty_rate_or_fixed: float = 0.0
    penalty_type: str = "none"  # none, percentage, fixed_fee, per_day
    grace_period_days: int = 0
    default_conditions: Optional[str] = ""
    exchange_rate_rule: Optional[str] = ""
    exchange_rate: float = 1.0
    target_currency: Optional[str] = None
    
    # Document metadata
    document_name: Optional[str] = None
    document_type: Optional[str] = None
    file_path: Optional[str] = None
    raw_text_preview: Optional[str] = None

class CaseCreateRequest(ExtractedAgreementData):
    pass

class PaymentCreateRequest(BaseModel):
    amount: float = Field(gt=0, description="Payment amount must be greater than zero")
    payment_date: str = Field(description="YYYY-MM-DD")
    currency: str = "USD"
    payment_reference: str = Field(min_length=1)
    notes: Optional[str] = None
    payment_plan_id: Optional[str] = None

class PaymentPlanItemResponse(BaseModel):
    id: str
    case_id: str
    instalment_number: int
    due_date: str
    amount_due: float
    amount_paid: float
    status: str
    paid_date: Optional[str] = None
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class PaymentResponse(BaseModel):
    id: str
    case_id: str
    payment_plan_id: Optional[str] = None
    amount: float
    payment_date: str
    currency: str
    payment_reference: str
    notes: Optional[str] = None
    created_at: str

    model_config = ConfigDict(from_attributes=True)

class AgreementResponse(BaseModel):
    id: str
    document_name: Optional[str] = None
    document_type: Optional[str] = None
    original_amount: float
    currency: str
    payment_amount: float
    frequency: str
    start_date: str
    instalments_count: int
    interest_rate: float
    penalty_rate_or_fixed: float
    penalty_type: str
    grace_period_days: int
    default_conditions: Optional[str] = None
    exchange_rate_rule: Optional[str] = None
    exchange_rate: float
    target_currency: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class PeriodDefaultImpact(BaseModel):
    instalment_number: int
    due_date: str
    amount_due: float
    amount_paid: float
    shortfall: float             # Unpaid amount for period (loss of expected cash flow)
    days_overdue: int            # Days elapsed past due date
    is_defaulted: bool           # Past grace period and unpaid
    status: str                  # upcoming, paid, partially_paid, overdue, defaulted
    period_interest: float       # Accrued interest on period shortfall
    period_penalty: float        # Default penalty triggered for this period
    period_creditor_gain: float  # Additional compensation / penalty claimable
    period_total_owed: float     # Total period liability (shortfall + interest + penalty)

class GainsAndLossesBreakdown(BaseModel):
    currency: str
    total_agreed: float
    total_expected_to_date: float
    total_paid_to_date: float
    cash_flow_shortfall: float       # Creditor lost cash flow to date
    unpaid_principal: float          # Remaining agreed principal
    total_accrued_interest: float    # Accrued interest on debt
    total_default_penalties: float   # Penalties assessed due to defaults
    total_creditor_gains: float      # Additional claimable earnings from defaults (interest + penalties)
    total_debtor_penalty_loss: float # Additional avoidable penalty cost incurred by debtor
    total_current_owed: float        # Total enforceable claim today
    defaulted_periods_count: int
    overdue_periods_count: int
    settled_periods_count: int
    has_defaulted: bool
    default_clause_status: str
    evaluation_date: str
    periods: List[PeriodDefaultImpact]

class AgreementUpdateRequest(BaseModel):
    defendant_name: Optional[str] = None
    defendant_address: Optional[str] = None
    defendant_contact: Optional[str] = None
    case_number: Optional[str] = None
    court_name: Optional[str] = None
    original_amount: Optional[float] = None
    currency: Optional[str] = None
    payment_amount: Optional[float] = None
    frequency: Optional[str] = None
    start_date: Optional[str] = None  # YYYY-MM-DD
    instalments_count: Optional[int] = None
    interest_rate: Optional[float] = None
    penalty_rate_or_fixed: Optional[float] = None
    penalty_type: Optional[str] = None
    grace_period_days: Optional[int] = None
    default_conditions: Optional[str] = None
    exchange_rate: Optional[float] = None
    target_currency: Optional[str] = None
    regenerate_schedule: bool = False

class PaymentPlanItemUpdateRequest(BaseModel):
    due_date: Optional[str] = None   # YYYY-MM-DD
    amount_due: Optional[float] = None
    notes: Optional[str] = None

class CalculationBreakdown(BaseModel):
    original_amount: float
    total_paid: float
    outstanding_principal: float
    accrued_interest: float
    default_interest_or_penalty: float
    exchange_rate: float
    currency: str
    target_currency: Optional[str] = None
    total_amount_owed: float
    step_by_step_log: List[str]
    calculation_date: str

class CaseDetailResponse(BaseModel):
    id: str
    case_number: str
    court_name: Optional[str] = None
    plaintiff_name: str
    plaintiff_address: Optional[str] = None
    plaintiff_contact: Optional[str] = None
    defendant_name: str
    defendant_address: Optional[str] = None
    defendant_contact: Optional[str] = None
    status: str
    created_at: str
    agreement: Optional[AgreementResponse] = None
    payment_plans: List[PaymentPlanItemResponse] = []
    payments: List[PaymentResponse] = []
    latest_calculation: Optional[CalculationBreakdown] = None
    gains_and_losses: Optional[GainsAndLossesBreakdown] = None

class DashboardStatsResponse(BaseModel):
    total_cases: int
    active_plans: int
    overdue_payments: int
    defaulted_cases: int
    total_outstanding_amount: float
    currency: str
    recent_cases: List[Dict[str, Any]]
