import json
import re
import uuid
from datetime import datetime, date
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings
from app.models import (
    Case, 
    Agreement, 
    PaymentPlanItem, 
    CalculationRecord, 
    PaymentCheckpoint, 
    InterestRateTranche, 
    CurrencyGainLossItem,
    Payment
)
from app.schemas import (
    CaseCreateRequest, 
    CaseDetailResponse, 
    AgreementResponse, 
    PaymentPlanItemResponse, 
    PaymentResponse, 
    CalculationBreakdown,
    AgreementUpdateRequest,
    PaymentPlanItemUpdateRequest,
    GainsAndLossesBreakdown,
    SettlementAccountCreateRequest,
    JudgmentDebtCreateRequest,
    PaymentCheckpointCreate,
    PaymentCheckpointResponse,
    InterestRateTrancheCreate,
    InterestRateTrancheResponse,
    MonthlyLedgerResponse,
    SettlementEvaluationResponse,
    CurrencyGainLossResponse,
    CurrencyGainLossItemCreate,
    CurrencyGainLossItemResponse
)
from app.services.calculation_engine import (
    generate_schedule_items, 
    evaluate_schedule_and_defaults, 
    calculate_outstanding_amount,
    calculate_gains_and_losses,
    generate_monthly_ledger,
    evaluate_settlement_checkpoints,
    calculate_fx_gain_loss
)

router = APIRouter(prefix="/api/cases", tags=["Cases"])

def get_case_detail_response(case: Case, db: Session, as_of_date: Optional[date] = None) -> CaseDetailResponse:
    if as_of_date is None:
        as_of_date = date.today()

    agreement = case.agreements[0] if case.agreements else None
    
    agr_resp = None
    if agreement:
        agr_resp = AgreementResponse(
            id=agreement.id,
            document_name=agreement.document_name,
            document_type=agreement.document_type,
            original_amount=agreement.original_amount,
            currency=agreement.currency,
            payment_amount=agreement.payment_amount,
            frequency=agreement.frequency,
            start_date=str(agreement.start_date),
            instalments_count=agreement.instalments_count,
            interest_rate=agreement.interest_rate,
            penalty_rate_or_fixed=agreement.penalty_rate_or_fixed,
            penalty_type=agreement.penalty_type,
            grace_period_days=agreement.grace_period_days,
            default_conditions=agreement.default_conditions,
            exchange_rate=agreement.exchange_rate,
            target_currency=agreement.target_currency
        )

    plans_resp = [
        PaymentPlanItemResponse(
            id=p.id,
            case_id=p.case_id,
            instalment_number=p.instalment_number,
            due_date=str(p.due_date),
            amount_due=p.amount_due,
            amount_paid=p.amount_paid,
            status=p.status,
            paid_date=str(p.paid_date) if p.paid_date else None,
            notes=p.notes
        )
        for p in case.payment_plan_items
    ]

    pmts_resp = [
        PaymentResponse(
            id=p.id,
            case_id=p.case_id,
            payment_plan_id=p.payment_plan_id,
            checkpoint_id=p.checkpoint_id,
            amount=p.amount,
            payment_date=str(p.payment_date),
            currency=p.currency,
            payment_reference=p.payment_reference,
            local_amount_paid=p.local_amount_paid,
            local_currency=p.local_currency,
            exchange_rate_applied=p.exchange_rate_applied,
            notes=p.notes,
            created_at=str(p.created_at)
        )
        for p in case.payments
    ]

    checkpoints_resp = [
        PaymentCheckpointResponse(
            id=cp.id,
            case_id=cp.case_id,
            checkpoint_number=cp.checkpoint_number,
            due_date=str(cp.due_date),
            cumulative_required=cp.cumulative_required,
            amount_required=cp.amount_required,
            actually_paid_by_then=cp.actually_paid_by_then,
            status=cp.status,
            notes=cp.notes
        )
        for cp in case.checkpoints
    ]

    tranches_resp = [
        InterestRateTrancheResponse(
            id=t.id,
            case_id=t.case_id,
            effective_from=str(t.effective_from),
            base_rate=t.base_rate,
            spread=t.spread,
            penal_rate=t.penal_rate,
            all_in_rate=t.all_in_rate,
            notes=t.notes
        )
        for t in case.interest_tranches
    ]

    fx_resp = [
        CurrencyGainLossItemResponse(
            id=f.id,
            case_id=f.case_id,
            obligation_due_date=str(f.obligation_due_date),
            amount_contract_curr=f.amount_contract_curr,
            payment_date=str(f.payment_date),
            due_date_rate=f.due_date_rate,
            actual_payment_rate=f.actual_payment_rate,
            local_currency_impact=f.local_currency_impact,
            local_currency=f.local_currency,
            notes=f.notes
        )
        for f in case.currency_gain_losses
    ]

    latest_calc = None
    if agreement and len(case.payment_plan_items) > 0:
        calc_obj = calculate_outstanding_amount(
            case=case,
            agreement=agreement,
            items=case.payment_plan_items,
            payments=case.payments,
            calc_date=as_of_date
        )
        latest_calc = calc_obj

    gains_losses = None
    if agreement and len(case.payment_plan_items) > 0:
        gains_losses = calculate_gains_and_losses(
            case=case,
            agreement=agreement,
            items=case.payment_plan_items,
            payments=case.payments,
            calc_date=as_of_date
        )

    # Settlement Checkpoint Evaluation
    settlement_eval = None
    if case.account_type == "settlement" or len(case.checkpoints) > 0:
        settlement_eval = evaluate_settlement_checkpoints(
            case=case,
            checkpoints=case.checkpoints,
            payments=case.payments,
            as_of_date=as_of_date
        )
        if settlement_eval.is_breached:
            case.is_breached = True
            if case.account_type == "settlement" and len(case.payment_plan_items) == 0:
                case.status = "breached"

    # Monthly Financial Ledger (for Judgment Debt / Variable Interest)
    monthly_ledger = None
    if case.account_type == "judgment_debt" or len(case.interest_tranches) > 0:
        monthly_ledger = generate_monthly_ledger(
            case=case,
            tranches=case.interest_tranches,
            payments=case.payments,
            as_of_date=as_of_date
        )

    return CaseDetailResponse(
        id=case.id,
        case_number=case.case_number,
        court_name=case.court_name,
        account_type=case.account_type,
        plaintiff_name=case.plaintiff_name,
        plaintiff_address=case.plaintiff_address,
        plaintiff_contact=case.plaintiff_contact,
        defendant_name=case.defendant_name,
        defendant_address=case.defendant_address,
        defendant_contact=case.defendant_contact,
        currency=case.currency,
        status=case.status,
        is_archived=case.is_archived,
        created_at=str(case.created_at),
        settlement_total=case.settlement_total,
        reinstatement_amount=case.reinstatement_amount,
        reinstatement_interest_rate=case.reinstatement_interest_rate,
        interest_accrual_start_date=str(case.interest_accrual_start_date) if case.interest_accrual_start_date else None,
        is_breached=case.is_breached,
        breached_date=str(case.breached_date) if case.breached_date else None,
        breached_reason=case.breached_reason,
        judgment_date=str(case.judgment_date) if case.judgment_date else None,
        cost_awarded=case.cost_awarded,
        interest_method=case.interest_method,
        agreement=agr_resp,
        payment_plans=plans_resp,
        checkpoints=checkpoints_resp,
        interest_tranches=tranches_resp,
        currency_gain_losses=fx_resp,
        payments=pmts_resp,
        latest_calculation=latest_calc,
        gains_and_losses=gains_losses,
        settlement_evaluation=settlement_eval,
        monthly_ledger=monthly_ledger
    )

# ----------------- CASE & ACCOUNT CREATION -----------------

@router.post("", response_model=CaseDetailResponse)
def create_case(payload: CaseCreateRequest, db: Session = Depends(get_db)):
    """Standard document / agreement case creation."""
    if not payload.defendant_name or not payload.defendant_name.strip():
        raise HTTPException(status_code=400, detail="Defendant name is required to create an account.")
    if payload.original_amount <= 0:
        raise HTTPException(status_code=400, detail="Original agreement amount must be greater than 0.")

    case_num = payload.case_number.strip() if payload.case_number and payload.case_number.strip() else ""
    if not case_num:
        clean_def = re.sub(r'[^A-Za-z0-9]', '', payload.defendant_name).upper()[:6] or "DEF"
        case_num = f"AGR-{datetime.now().year}-{clean_def}-{uuid.uuid4().hex[:4].upper()}"

    new_case = Case(
        case_number=case_num,
        court_name=payload.court_name.strip() if payload.court_name and payload.court_name.strip() else None,
        account_type=payload.account_type or "settlement",
        plaintiff_name=settings.DEFAULT_PLAINTIFF_NAME,
        plaintiff_address=settings.DEFAULT_PLAINTIFF_ADDRESS,
        plaintiff_contact=settings.DEFAULT_PLAINTIFF_CONTACT,
        defendant_name=payload.defendant_name.strip(),
        defendant_address=payload.defendant_address,
        defendant_contact=payload.defendant_contact,
        currency=payload.currency.upper(),
        settlement_total=payload.original_amount,
        status="active"
    )
    db.add(new_case)
    db.flush()

    try:
        start_date_obj = datetime.strptime(payload.start_date, "%Y-%m-%d").date()
    except Exception:
        start_date_obj = date.today()

    new_agreement = Agreement(
        case_id=new_case.id,
        document_name=payload.document_name,
        document_type=payload.document_type,
        file_path=payload.file_path,
        original_amount=payload.original_amount,
        currency=payload.currency.upper(),
        payment_amount=payload.payment_amount,
        frequency=payload.frequency.lower(),
        start_date=start_date_obj,
        instalments_count=max(1, payload.instalments_count),
        interest_rate=payload.interest_rate,
        penalty_rate_or_fixed=payload.penalty_rate_or_fixed,
        penalty_type=payload.penalty_type,
        grace_period_days=payload.grace_period_days,
        default_conditions=payload.default_conditions,
        exchange_rate_rule=payload.exchange_rate_rule,
        exchange_rate=payload.exchange_rate or 1.0,
        target_currency=payload.target_currency.upper() if payload.target_currency else None,
        extracted_raw_json=json.dumps(payload.model_dump())
    )
    db.add(new_agreement)
    db.flush()

    raw_schedule = generate_schedule_items(
        original_amount=new_agreement.original_amount,
        start_date=new_agreement.start_date,
        instalments_count=new_agreement.instalments_count,
        frequency=new_agreement.frequency
    )

    plan_items = []
    running_cum = 0.0
    for idx, item in enumerate(raw_schedule, 1):
        plan_item = PaymentPlanItem(
            case_id=new_case.id,
            instalment_number=item["instalment_number"],
            due_date=item["due_date"],
            amount_due=item["amount_due"],
            amount_paid=item["amount_paid"],
            status=item["status"]
        )
        db.add(plan_item)
        plan_items.append(plan_item)
        
        # Also create a corresponding checkpoint for unified monitoring
        running_cum = round(running_cum + item["amount_due"], 2)
        cp = PaymentCheckpoint(
            case_id=new_case.id,
            checkpoint_number=idx,
            due_date=item["due_date"],
            cumulative_required=running_cum,
            amount_required=item["amount_due"],
            status="not_due"
        )
        db.add(cp)

    # Evaluate schedule against payments / dates to detect defaults
    case_status, evaluated_items = evaluate_schedule_and_defaults(
        items=plan_items,
        payments=[],
        grace_period_days=new_agreement.grace_period_days,
        eval_date=date.today()
    )
    new_case.status = case_status

    calc = calculate_outstanding_amount(
        case=new_case,
        agreement=new_agreement,
        items=evaluated_items,
        payments=[],
        calc_date=date.today()
    )
    calc_record = CalculationRecord(
        case_id=new_case.id,
        original_amount=calc.original_amount,
        total_paid=calc.total_paid,
        outstanding_principal=calc.outstanding_principal,
        accrued_interest=calc.accrued_interest,
        default_interest_or_penalty=calc.default_interest_or_penalty,
        exchange_rate=calc.exchange_rate,
        currency=calc.currency,
        target_currency=calc.target_currency,
        total_amount_owed=calc.total_amount_owed,
        breakdown_json=json.dumps(calc.step_by_step_log)
    )
    db.add(calc_record)

    db.commit()
    db.refresh(new_case)
    return get_case_detail_response(new_case, db)

@router.post("/settlement", response_model=CaseDetailResponse)
def create_settlement_account(payload: SettlementAccountCreateRequest, db: Session = Depends(get_db)):
    """
    Dedicated endpoint for creating a Settlement Account (Image 3):
    Account / Client Name, Currency, Settlement Total, Reinstatement Amount,
    Reinstatement Interest Rate, Interest Accrual Start Date, and Checkpoints.
    """
    if not payload.defendant_name or not payload.defendant_name.strip():
        raise HTTPException(status_code=400, detail="Account / Client name is required.")
    if payload.settlement_total <= 0:
        raise HTTPException(status_code=400, detail="Settlement total must be greater than zero.")

    case_num = payload.case_number.strip() if payload.case_number and payload.case_number.strip() else ""
    if not case_num:
        clean_def = re.sub(r'[^A-Za-z0-9]', '', payload.defendant_name).upper()[:6] or "SET"
        case_num = f"SET-{datetime.now().year}-{clean_def}-{uuid.uuid4().hex[:4].upper()}"

    try:
        accrual_start = datetime.strptime(payload.interest_accrual_start_date, "%Y-%m-%d").date()
    except Exception:
        accrual_start = date.today()

    new_case = Case(
        case_number=case_num,
        court_name=payload.court_name,
        account_type="settlement",
        plaintiff_name=settings.DEFAULT_PLAINTIFF_NAME,
        plaintiff_address=settings.DEFAULT_PLAINTIFF_ADDRESS,
        plaintiff_contact=settings.DEFAULT_PLAINTIFF_CONTACT,
        defendant_name=payload.defendant_name.strip(),
        defendant_address=payload.defendant_address,
        defendant_contact=payload.defendant_contact,
        currency=payload.currency.upper(),
        settlement_total=round(payload.settlement_total, 2),
        reinstatement_amount=round(payload.reinstatement_amount, 2),
        reinstatement_interest_rate=round(payload.reinstatement_interest_rate, 2),
        interest_accrual_start_date=accrual_start,
        status="active"
    )
    db.add(new_case)
    db.flush()

    # Create companion Agreement record for compatibility
    new_agreement = Agreement(
        case_id=new_case.id,
        document_name=f"Settlement_{payload.defendant_name.replace(' ', '_')}.pdf",
        document_type="settlement_agreement",
        original_amount=round(payload.settlement_total, 2),
        currency=payload.currency.upper(),
        payment_amount=round(payload.settlement_total / (len(payload.checkpoints) or 1), 2),
        frequency="monthly",
        start_date=accrual_start,
        instalments_count=max(1, len(payload.checkpoints)),
        interest_rate=payload.reinstatement_interest_rate,
        default_conditions="If settlement is broken, full reinstatement figure + interest applies."
    )
    db.add(new_agreement)
    db.flush()

    # Add checkpoints
    for idx, cp_data in enumerate(payload.checkpoints, 1):
        try:
            cp_due = datetime.strptime(cp_data.due_date, "%Y-%m-%d").date()
        except Exception:
            cp_due = accrual_start
            
        cp = PaymentCheckpoint(
            case_id=new_case.id,
            checkpoint_number=cp_data.checkpoint_number or idx,
            due_date=cp_due,
            cumulative_required=round(cp_data.cumulative_required, 2),
            amount_required=round(cp_data.amount_required, 2),
            actually_paid_by_then=0.0,
            status="not_due",
            notes=cp_data.notes
        )
        db.add(cp)

    db.commit()
    db.refresh(new_case)
    return get_case_detail_response(new_case, db)

@router.post("/judgment-debt", response_model=CaseDetailResponse)
def create_judgment_debt_account(payload: JudgmentDebtCreateRequest, db: Session = Depends(get_db)):
    """
    Dedicated endpoint for creating a Judgment Debt Court Order (Image 1):
    Defendant name, Judgment Debt amount, Judgment Date, Costs awarded, Interest Method.
    """
    if not payload.defendant_name or not payload.defendant_name.strip():
        raise HTTPException(status_code=400, detail="Defendant name is required.")
    if payload.judgment_debt <= 0:
        raise HTTPException(status_code=400, detail="Judgment debt must be greater than zero.")

    case_num = payload.case_number.strip() if payload.case_number and payload.case_number.strip() else ""
    if not case_num:
        clean_def = re.sub(r'[^A-Za-z0-9]', '', payload.defendant_name).upper()[:6] or "JDG"
        case_num = f"HC/{datetime.now().year}/ACCRA/{uuid.uuid4().hex[:3].upper()}"

    try:
        jdg_date = datetime.strptime(payload.judgment_date, "%Y-%m-%d").date()
    except Exception:
        jdg_date = date.today()

    new_case = Case(
        case_number=case_num,
        court_name=payload.court_name or "High Court of Justice (Commercial Division), Accra",
        account_type="judgment_debt",
        plaintiff_name=settings.DEFAULT_PLAINTIFF_NAME,
        plaintiff_address=settings.DEFAULT_PLAINTIFF_ADDRESS,
        plaintiff_contact=settings.DEFAULT_PLAINTIFF_CONTACT,
        defendant_name=payload.defendant_name.strip(),
        defendant_address=payload.defendant_address,
        defendant_contact=payload.defendant_contact,
        currency=payload.currency.upper(),
        settlement_total=round(payload.judgment_debt, 2),
        judgment_date=jdg_date,
        cost_awarded=round(payload.cost_awarded, 2),
        interest_method=payload.interest_method,
        status="active"
    )
    db.add(new_case)
    db.flush()

    # Add initial interest rate tranche if provided
    if payload.initial_tranche:
        try:
            eff_from = datetime.strptime(payload.initial_tranche.effective_from, "%Y-%m-%d").date()
        except Exception:
            eff_from = jdg_date
            
        all_in = round(payload.initial_tranche.base_rate + payload.initial_tranche.spread + payload.initial_tranche.penal_rate, 2)
        tranche = InterestRateTranche(
            case_id=new_case.id,
            effective_from=eff_from,
            base_rate=round(payload.initial_tranche.base_rate, 2),
            spread=round(payload.initial_tranche.spread, 2),
            penal_rate=round(payload.initial_tranche.penal_rate, 2),
            all_in_rate=all_in,
            notes=payload.initial_tranche.notes
        )
        db.add(tranche)

    db.commit()
    db.refresh(new_case)
    return get_case_detail_response(new_case, db)

# ----------------- CASE LISTING & SEARCH -----------------

@router.get("", response_model=List[CaseDetailResponse])
def list_cases(
    type: Optional[str] = None, # 'settlement' or 'judgment_debt'
    include_archived: bool = False,
    db: Session = Depends(get_db)
):
    query = db.query(Case)
    if not include_archived:
        query = query.filter(Case.is_archived == False)
    if type:
        query = query.filter(Case.account_type == type)
    cases = query.order_by(Case.created_at.desc()).all()
    return [get_case_detail_response(c, db) for c in cases]

@router.get("/search", response_model=List[CaseDetailResponse])
def search_cases(q: str = "", db: Session = Depends(get_db)):
    query = q.strip().lower()
    if not query:
        cases = db.query(Case).filter(Case.is_archived == False).order_by(Case.created_at.desc()).limit(30).all()
    else:
        cases = db.query(Case).filter(
            Case.is_archived == False,
            (Case.defendant_name.ilike(f"%{query}%")) |
            (Case.case_number.ilike(f"%{query}%")) |
            (Case.court_name.ilike(f"%{query}%"))
        ).order_by(Case.created_at.desc()).all()
    return [get_case_detail_response(c, db) for c in cases]

@router.get("/{case_id}", response_model=CaseDetailResponse)
def get_case(
    case_id: str, 
    as_of_date: Optional[str] = Query(None, description="Calculate balances & breaches as of date (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Account not found")

    as_of_obj = None
    if as_of_date:
        try:
            as_of_obj = datetime.strptime(as_of_date, "%Y-%m-%d").date()
        except Exception:
            pass

    return get_case_detail_response(case, db, as_of_date=as_of_obj)

@router.get("/{case_id}/gains-and-losses", response_model=GainsAndLossesBreakdown)
def get_gains_and_losses(case_id: str, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Account not found")
    agreement = case.agreements[0] if case.agreements else None
    if not agreement:
        raise HTTPException(status_code=404, detail="No agreement terms associated with this case.")
    return calculate_gains_and_losses(
        case=case,
        agreement=agreement,
        items=case.payment_plan_items,
        payments=case.payments
    )

# ----------------- ACCRUE DEDICATED MODULE ENDPOINTS -----------------

@router.get("/{case_id}/ledger", response_model=MonthlyLedgerResponse)
def get_account_monthly_ledger(
    case_id: str,
    as_of_date: Optional[str] = Query(None, description="As of date YYYY-MM-DD"),
    db: Session = Depends(get_db)
):
    """Returns month-by-month financial ledger with day counts and interest due (Image 1)."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Account not found")

    as_of_obj = None
    if as_of_date:
        try:
            as_of_obj = datetime.strptime(as_of_date, "%Y-%m-%d").date()
        except Exception:
            pass

    return generate_monthly_ledger(
        case=case,
        tranches=case.interest_tranches,
        payments=case.payments,
        as_of_date=as_of_obj
    )

@router.get("/{case_id}/checkpoints", response_model=SettlementEvaluationResponse)
def get_account_checkpoints(
    case_id: str,
    as_of_date: Optional[str] = Query(None, description="As of date YYYY-MM-DD"),
    db: Session = Depends(get_db)
):
    """Returns checkpoints schedule and live breach evaluation (Image 2 & 5)."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Account not found")

    as_of_obj = None
    if as_of_date:
        try:
            as_of_obj = datetime.strptime(as_of_date, "%Y-%m-%d").date()
        except Exception:
            pass

    return evaluate_settlement_checkpoints(
        case=case,
        checkpoints=case.checkpoints,
        payments=case.payments,
        as_of_date=as_of_obj
    )

@router.post("/{case_id}/checkpoints", response_model=CaseDetailResponse)
def add_checkpoint(case_id: str, payload: PaymentCheckpointCreate, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Account not found")

    try:
        cp_due = datetime.strptime(payload.due_date, "%Y-%m-%d").date()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid due_date format (expected YYYY-MM-DD)")

    next_num = payload.checkpoint_number or (len(case.checkpoints) + 1)
    cp = PaymentCheckpoint(
        case_id=case.id,
        checkpoint_number=next_num,
        due_date=cp_due,
        cumulative_required=round(payload.cumulative_required, 2),
        amount_required=round(payload.amount_required or 0.0, 2),
        status="not_due",
        notes=payload.notes
    )
    db.add(cp)
    db.commit()
    db.refresh(case)
    return get_case_detail_response(case, db)

@router.post("/{case_id}/tranches", response_model=CaseDetailResponse)
def add_interest_tranche(case_id: str, payload: InterestRateTrancheCreate, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Account not found")

    try:
        eff_from = datetime.strptime(payload.effective_from, "%Y-%m-%d").date()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid effective_from format (expected YYYY-MM-DD)")

    all_in = round(payload.base_rate + payload.spread + payload.penal_rate, 2)
    tranche = InterestRateTranche(
        case_id=case.id,
        effective_from=eff_from,
        base_rate=round(payload.base_rate, 2),
        spread=round(payload.spread, 2),
        penal_rate=round(payload.penal_rate, 2),
        all_in_rate=all_in,
        notes=payload.notes
    )
    db.add(tranche)
    db.commit()
    db.refresh(case)
    return get_case_detail_response(case, db)

@router.get("/{case_id}/fx-impact", response_model=CurrencyGainLossResponse)
def get_fx_impact(case_id: str, db: Session = Depends(get_db)):
    """Returns currency gain/loss breakdown comparing payment conversion rates vs due date rates (Image 4)."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Account not found")
    return calculate_fx_gain_loss(case, case.currency_gain_losses)

@router.post("/{case_id}/fx-impact", response_model=CaseDetailResponse)
def add_fx_impact_item(case_id: str, payload: CurrencyGainLossItemCreate, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Account not found")

    try:
        due_d = datetime.strptime(payload.obligation_due_date, "%Y-%m-%d").date()
        pmt_d = datetime.strptime(payload.payment_date, "%Y-%m-%d").date()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid date format (expected YYYY-MM-DD)")

    impact = round((payload.due_date_rate - payload.actual_payment_rate) * payload.amount_contract_curr, 2)
    fx_item = CurrencyGainLossItem(
        case_id=case.id,
        obligation_due_date=due_d,
        amount_contract_curr=round(payload.amount_contract_curr, 2),
        payment_date=pmt_d,
        due_date_rate=round(payload.due_date_rate, 4),
        actual_payment_rate=round(payload.actual_payment_rate, 4),
        local_currency_impact=impact,
        local_currency=payload.local_currency.upper(),
        notes=payload.notes
    )
    db.add(fx_item)
    db.commit()
    db.refresh(case)
    return get_case_detail_response(case, db)

# ----------------- UPDATE, ARCHIVE, DELETE & BACKUP -----------------

@router.put("/{case_id}", response_model=CaseDetailResponse)
def update_case(case_id: str, payload: AgreementUpdateRequest, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Account not found")

    if payload.defendant_name is not None and payload.defendant_name.strip():
        case.defendant_name = payload.defendant_name.strip()
    if payload.defendant_address is not None:
        case.defendant_address = payload.defendant_address
    if payload.defendant_contact is not None:
        case.defendant_contact = payload.defendant_contact
    if payload.case_number is not None and payload.case_number.strip():
        case.case_number = payload.case_number.strip()
    if payload.court_name is not None:
        case.court_name = payload.court_name.strip() if payload.court_name.strip() else None
    if payload.currency is not None and payload.currency.strip():
        case.currency = payload.currency.upper().strip()
    
    # Settlement updates
    if payload.settlement_total is not None and payload.settlement_total > 0:
        case.settlement_total = round(payload.settlement_total, 2)
    if payload.reinstatement_amount is not None:
        case.reinstatement_amount = round(payload.reinstatement_amount, 2)
    if payload.reinstatement_interest_rate is not None:
        case.reinstatement_interest_rate = round(payload.reinstatement_interest_rate, 2)
    if payload.interest_accrual_start_date is not None:
        try:
            case.interest_accrual_start_date = datetime.strptime(payload.interest_accrual_start_date, "%Y-%m-%d").date()
        except Exception:
            pass

    # Judgment debt updates
    if payload.judgment_date is not None:
        try:
            case.judgment_date = datetime.strptime(payload.judgment_date, "%Y-%m-%d").date()
        except Exception:
            pass
    if payload.cost_awarded is not None:
        case.cost_awarded = round(payload.cost_awarded, 2)
    if payload.interest_method is not None:
        case.interest_method = payload.interest_method

    agreement = case.agreements[0] if case.agreements else None
    if agreement:
        if payload.original_amount is not None and payload.original_amount > 0:
            agreement.original_amount = round(payload.original_amount, 2)
        if payload.currency is not None:
            agreement.currency = payload.currency.upper().strip()
        if payload.payment_amount is not None:
            agreement.payment_amount = round(payload.payment_amount, 2)
        if payload.frequency is not None:
            agreement.frequency = payload.frequency.lower().strip()
        if payload.start_date is not None:
            try:
                agreement.start_date = datetime.strptime(payload.start_date.strip(), "%Y-%m-%d").date()
            except Exception:
                pass
        if payload.instalments_count is not None and payload.instalments_count > 0:
            agreement.instalments_count = payload.instalments_count
        if payload.interest_rate is not None:
            agreement.interest_rate = round(payload.interest_rate, 2)
        if payload.penalty_rate_or_fixed is not None:
            agreement.penalty_rate_or_fixed = round(payload.penalty_rate_or_fixed, 2)
        if payload.penalty_type is not None:
            agreement.penalty_type = payload.penalty_type
        if payload.grace_period_days is not None:
            agreement.grace_period_days = payload.grace_period_days
        if payload.default_conditions is not None:
            agreement.default_conditions = payload.default_conditions

        if payload.regenerate_schedule:
            for item in case.payment_plan_items:
                db.delete(item)
            raw_schedule = generate_schedule_items(
                original_amount=agreement.original_amount,
                start_date=agreement.start_date,
                instalments_count=agreement.instalments_count,
                frequency=agreement.frequency
            )
            for item in raw_schedule:
                db.add(PaymentPlanItem(
                    case_id=case.id,
                    instalment_number=item["instalment_number"],
                    due_date=item["due_date"],
                    amount_due=item["amount_due"],
                    amount_paid=0.0,
                    status=item["status"]
                ))

    db.commit()
    db.refresh(case)
    return get_case_detail_response(case, db)

@router.delete("/{case_id}")
def delete_case(case_id: str, db: Session = Depends(get_db)):
    """Permanently delete an account and all associated records."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Account not found")
    db.delete(case)
    db.commit()
    return {"status": "success", "message": f"Account {case_id} permanently deleted"}

@router.post("/{case_id}/archive")
def archive_case(case_id: str, db: Session = Depends(get_db)):
    """Toggles archive status for an account."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Account not found")
    case.is_archived = not case.is_archived
    db.commit()
    return {"status": "success", "is_archived": case.is_archived}

@router.get("/export/backup")
def export_full_backup(db: Session = Depends(get_db)):
    """
    Downloads full JSON backup of all accounts, settlement terms, checkpoints,
    rate tranches, ledger configs, payments, and FX impact records.
    Matches 'Download full backup' button in the reference sidebar.
    """
    cases = db.query(Case).all()
    backup_data = {
        "system": "Accrue / Universal Merchant Bank Legal Debt & Settlement Tracker",
        "exported_at": datetime.now().isoformat(),
        "total_accounts": len(cases),
        "accounts": [get_case_detail_response(c, db).model_dump() for c in cases]
    }
    return backup_data
