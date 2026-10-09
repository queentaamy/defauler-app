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
    account_type: str = "settlement" # 'settlement' or 'judgment_debt'

class PaymentCreateRequest(BaseModel):
    amount: float = Field(gt=0, description="Payment amount must be greater than zero")
    payment_date: str = Field(description="YYYY-MM-DD")
    currency: str = "USD"
    payment_reference: str = Field(min_length=1)
    notes: Optional[str] = None
    payment_plan_id: Optional[str] = None
    checkpoint_id: Optional[str] = None
    local_amount_paid: Optional[float] = None
    local_currency: Optional[str] = None
    exchange_rate_applied: Optional[float] = None

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
    checkpoint_id: Optional[str] = None
    amount: float
    payment_date: str
    currency: str
    payment_reference: str
    local_amount_paid: Optional[float] = None
    local_currency: Optional[str] = None
    exchange_rate_applied: Optional[float] = None
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
    exchange_rate: float
    target_currency: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

# ----------------- ACCRUE SETTLEMENT & CHECKPOINT SCHEMAS -----------------

class PaymentCheckpointCreate(BaseModel):
    checkpoint_number: int = 1
    due_date: str # YYYY-MM-DD
    cumulative_required: float
    amount_required: Optional[float] = 0.0
    notes: Optional[str] = None

class PaymentCheckpointResponse(BaseModel):
    id: str
    case_id: str
    checkpoint_number: int
    due_date: str
    cumulative_required: float
    amount_required: float
    actually_paid_by_then: float
    status: str # 'met', 'missed', 'on_track', 'not_due'
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class SettlementEvaluationResponse(BaseModel):
    is_breached: bool
    status: str # 'SETTLEMENT BREACHED', 'ON TRACK', 'FULLY SETTLED'
    status_message: str
    settlement_total: float
    reinstatement_amount: float
    reinstatement_interest_rate: float
    interest_accrual_start_date: Optional[str] = None
    as_of_date: str
    total_paid: float
    reinstated_amount_due: Optional[float] = None
    remaining_under_settlement: Optional[float] = None
    next_checkpoint_target: Optional[float] = None
    next_checkpoint_date: Optional[str] = None
    checkpoints: List[PaymentCheckpointResponse] = []

class SettlementAccountCreateRequest(BaseModel):
    defendant_name: str # e.g. Ghana Alu Ltd
    currency: str = "USD"
    settlement_total: float # e.g. 6000000.00
    reinstatement_amount: float # e.g. 8256340.67
    reinstatement_interest_rate: float = 12.0 # Annual %
    interest_accrual_start_date: str # YYYY-MM-DD
    case_number: Optional[str] = None
    defendant_address: Optional[str] = None
    defendant_contact: Optional[str] = None
    court_name: Optional[str] = None
    checkpoints: List[PaymentCheckpointCreate] = []

# ----------------- ACCRUE JUDGMENT DEBT & LEDGER SCHEMAS -----------------

class InterestRateTrancheCreate(BaseModel):
    effective_from: str # YYYY-MM-DD
    base_rate: float
    spread: float = 0.0
    penal_rate: float = 0.0
    notes: Optional[str] = None

class InterestRateTrancheResponse(BaseModel):
    id: str
    case_id: str
    effective_from: str
    base_rate: float
    spread: float
    penal_rate: float
    all_in_rate: float
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class MonthlyLedgerRow(BaseModel):
    index: int
    period: str # e.g. "31 Jan 2022 - 28 Feb 2022"
    days: int # e.g. 28
    all_in_rate: float # e.g. 16.20
    balance: float # e.g. 200,000.00
    payment: Optional[float] = None
    interest_due: float # e.g. 2,520.00
    cumulative_interest: float # e.g. 136,710.00

class MonthlyLedgerResponse(BaseModel):
    currency: str
    judgment_debt: float
    judgment_date: str
    cost_awarded: float
    interest_method: str
    as_of_date: str
    current_balance: float
    total_cumulative_interest: float
    total_paid: float
    total_amount_owed: float
    rows: List[MonthlyLedgerRow]

class JudgmentDebtCreateRequest(BaseModel):
    defendant_name: str
    case_number: Optional[str] = None
    court_name: Optional[str] = None
    currency: str = "GHS"
    judgment_debt: float
    judgment_date: str # YYYY-MM-DD
    cost_awarded: float = 0.0
    interest_method: str = "simple_30_360" # simple_30_360, simple_actual_365, compound
    initial_tranche: Optional[InterestRateTrancheCreate] = None
    defendant_address: Optional[str] = None
    defendant_contact: Optional[str] = None

# ----------------- ACCRUE CURRENCY GAIN/LOSS SCHEMAS -----------------

class CurrencyGainLossItemCreate(BaseModel):
    obligation_due_date: str # YYYY-MM-DD
    amount_contract_curr: float
    payment_date: str # YYYY-MM-DD
    due_date_rate: float # e.g. 7.1128
    actual_payment_rate: float # e.g. 7.2245
    local_currency: str = "GHS"
    notes: Optional[str] = None

class CurrencyGainLossItemResponse(BaseModel):
    id: str
    case_id: str
    obligation_due_date: str
    amount_contract_curr: float
    payment_date: str
    due_date_rate: float
    actual_payment_rate: float
    local_currency_impact: float
    local_currency: str
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class CurrencyGainLossResponse(BaseModel):
    total_currency_impact: float
    local_currency: str
    contract_currency: str
    items: List[CurrencyGainLossItemResponse] = []

# ----------------- GENERAL CASE DETAIL & STATS -----------------

class AgreementUpdateRequest(BaseModel):
    defendant_name: Optional[str] = None
    defendant_address: Optional[str] = None
    defendant_contact: Optional[str] = None
    court_name: Optional[str] = None
    case_number: Optional[str] = None
    currency: Optional[str] = None
    original_amount: Optional[float] = None
    payment_amount: Optional[float] = None
    frequency: Optional[str] = None
    start_date: Optional[str] = None
    instalments_count: Optional[int] = None
    interest_rate: Optional[float] = None
    penalty_rate_or_fixed: Optional[float] = None
    penalty_type: Optional[str] = None
    grace_period_days: Optional[int] = None
    default_conditions: Optional[str] = None
    exchange_rate: Optional[float] = None
    target_currency: Optional[str] = None
    regenerate_schedule: bool = False
    
    # Settlement Account Updates
    settlement_total: Optional[float] = None
    reinstatement_amount: Optional[float] = None
    reinstatement_interest_rate: Optional[float] = None
    interest_accrual_start_date: Optional[str] = None
    
    # Judgment Debt Updates
    judgment_date: Optional[str] = None
    cost_awarded: Optional[float] = None
    interest_method: Optional[str] = None

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

class PeriodDefaultImpact(BaseModel):
    instalment_number: int
    due_date: str
    amount_due: float
    amount_paid: float
    shortfall: float
    days_overdue: int
    is_defaulted: bool
    status: str
    period_interest: float
    period_penalty: float
    period_creditor_gain: float
    period_total_owed: float

class GainsAndLossesBreakdown(BaseModel):
    currency: str
    total_agreed: float
    total_expected_to_date: float
    total_paid_to_date: float
    cash_flow_shortfall: float
    unpaid_principal: float
    total_accrued_interest: float
    total_default_penalties: float
    total_creditor_gains: float
    total_debtor_penalty_loss: float
    total_current_owed: float
    defaulted_periods_count: int
    overdue_periods_count: int
    settled_periods_count: int
    has_defaulted: bool
    default_clause_status: str
    evaluation_date: str
    periods: List[PeriodDefaultImpact] = []

class CaseDetailResponse(BaseModel):
    id: str
    case_number: str
    court_name: Optional[str] = None
    account_type: str = "settlement"
    plaintiff_name: str
    plaintiff_address: Optional[str] = None
    plaintiff_contact: Optional[str] = None
    defendant_name: str
    defendant_address: Optional[str] = None
    defendant_contact: Optional[str] = None
    currency: str = "USD"
    status: str
    is_archived: bool = False
    created_at: str
    
    # Settlement Terms
    settlement_total: Optional[float] = None
    reinstatement_amount: Optional[float] = None
    reinstatement_interest_rate: Optional[float] = None
    interest_accrual_start_date: Optional[str] = None
    is_breached: bool = False
    breached_date: Optional[str] = None
    breached_reason: Optional[str] = None

    # Judgment Debt Terms
    judgment_date: Optional[str] = None
    cost_awarded: float = 0.0
    interest_method: str = "simple_30_360"

    agreement: Optional[AgreementResponse] = None
    payment_plans: List[PaymentPlanItemResponse] = []
    checkpoints: List[PaymentCheckpointResponse] = []
    interest_tranches: List[InterestRateTrancheResponse] = []
    currency_gain_losses: List[CurrencyGainLossItemResponse] = []
    payments: List[PaymentResponse] = []
    
    latest_calculation: Optional[CalculationBreakdown] = None
    gains_and_losses: Optional[GainsAndLossesBreakdown] = None
    settlement_evaluation: Optional[SettlementEvaluationResponse] = None
    monthly_ledger: Optional[MonthlyLedgerResponse] = None

class DashboardStatsResponse(BaseModel):
    total_cases: int
    active_plans: int
    overdue_payments: int
    defaulted_cases: int
    total_outstanding_amount: float
    currency: str
    recent_cases: List[Dict[str, Any]]
