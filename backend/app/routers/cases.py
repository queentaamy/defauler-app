import json
import re
import uuid
from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings
from app.models import Case, Agreement, PaymentPlanItem, CalculationRecord
from app.schemas import (
    CaseCreateRequest, 
    CaseDetailResponse, 
    AgreementResponse, 
    PaymentPlanItemResponse, 
    PaymentResponse, 
    CalculationBreakdown,
    AgreementUpdateRequest,
    PaymentPlanItemUpdateRequest,
    GainsAndLossesBreakdown
)
from app.services.calculation_engine import (
    generate_schedule_items, 
    evaluate_schedule_and_defaults, 
    calculate_outstanding_amount,
    calculate_gains_and_losses
)

router = APIRouter(prefix="/api/cases", tags=["Cases"])

@router.post("", response_model=CaseDetailResponse)
def create_case(payload: CaseCreateRequest, db: Session = Depends(get_db)):
    if not payload.defendant_name or not payload.defendant_name.strip():
        raise HTTPException(status_code=400, detail="Defendant name is required to create an account.")
    if payload.original_amount <= 0:
        raise HTTPException(status_code=400, detail="Original agreement amount must be greater than 0.")

    # Auto-generate agreement account reference if formal case number was omitted
    case_num = payload.case_number.strip() if payload.case_number and payload.case_number.strip() else ""
    if not case_num:
        clean_def = re.sub(r'[^A-Za-z0-9]', '', payload.defendant_name).upper()[:6] or "DEF"
        case_num = f"AGR-{datetime.now().year}-{clean_def}-{uuid.uuid4().hex[:4].upper()}"

    # 1. Create Case / Account with fixed Plaintiff info from system config
    new_case = Case(
        case_number=case_num,
        court_name=payload.court_name.strip() if payload.court_name and payload.court_name.strip() else None,
        plaintiff_name=settings.DEFAULT_PLAINTIFF_NAME,
        plaintiff_address=settings.DEFAULT_PLAINTIFF_ADDRESS,
        plaintiff_contact=settings.DEFAULT_PLAINTIFF_CONTACT,
        defendant_name=payload.defendant_name.strip(),
        defendant_address=payload.defendant_address,
        defendant_contact=payload.defendant_contact,
        status="active"
    )
    db.add(new_case)
    db.flush()

    # 2. Parse start date
    try:
        start_date_obj = datetime.strptime(payload.start_date, "%Y-%m-%d").date()
    except Exception:
        start_date_obj = date.today()

    # 3. Create Agreement
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

    # 4. Generate payment schedule items
    raw_schedule = generate_schedule_items(
        original_amount=new_agreement.original_amount,
        start_date=new_agreement.start_date,
        instalments_count=new_agreement.instalments_count,
        frequency=new_agreement.frequency
    )

    plan_items = []
    for item in raw_schedule:
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
    
    db.flush()

    # 5. Evaluate defaults & schedule
    case_status, evaluated_items = evaluate_schedule_and_defaults(
        items=plan_items,
        payments=[],
        grace_period_days=new_agreement.grace_period_days
    )
    new_case.status = case_status

    # 6. Run initial calculation engine
    calc = calculate_outstanding_amount(
        case=new_case,
        agreement=new_agreement,
        items=evaluated_items,
        payments=[]
    )

    # Persist calculation record for audit trail
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

def get_case_detail_response(case: Case, db: Session) -> CaseDetailResponse:
    agreement = case.agreements[0] if case.agreements else None
    
    # Format agreement
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
            exchange_rate_rule=agreement.exchange_rate_rule,
            exchange_rate=agreement.exchange_rate,
            target_currency=agreement.target_currency
        )

    # Format payment plans
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
        ) for p in case.payment_plan_items
    ]

    # Format payments
    pmts_resp = [
        PaymentResponse(
            id=pm.id,
            case_id=pm.case_id,
            payment_plan_id=pm.payment_plan_id,
            amount=pm.amount,
            payment_date=str(pm.payment_date),
            currency=pm.currency,
            payment_reference=pm.payment_reference,
            notes=pm.notes,
            created_at=str(pm.created_at)
        ) for pm in case.payments
    ]

    # Latest calculation breakdown
    latest_calc = None
    if case.calculation_records:
        rec = case.calculation_records[0] # ordered desc
        latest_calc = CalculationBreakdown(
            original_amount=rec.original_amount,
            total_paid=rec.total_paid,
            outstanding_principal=rec.outstanding_principal,
            accrued_interest=rec.accrued_interest,
            default_interest_or_penalty=rec.default_interest_or_penalty,
            exchange_rate=rec.exchange_rate,
            currency=rec.currency,
            target_currency=rec.target_currency,
            total_amount_owed=rec.total_amount_owed,
            step_by_step_log=json.loads(rec.breakdown_json) if rec.breakdown_json else [],
            calculation_date=str(rec.calculation_date)
        )

    # Calculate gains and losses
    gains_losses = None
    if agreement:
        gains_losses = calculate_gains_and_losses(
            case=case,
            agreement=agreement,
            items=case.payment_plan_items,
            payments=case.payments
        )

    return CaseDetailResponse(
        id=case.id,
        case_number=case.case_number,
        court_name=case.court_name,
        plaintiff_name=case.plaintiff_name,
        plaintiff_address=case.plaintiff_address,
        plaintiff_contact=case.plaintiff_contact,
        defendant_name=case.defendant_name,
        defendant_address=case.defendant_address,
        defendant_contact=case.defendant_contact,
        status=case.status,
        created_at=str(case.created_at),
        agreement=agr_resp,
        payment_plans=plans_resp,
        payments=pmts_resp,
        latest_calculation=latest_calc,
        gains_and_losses=gains_losses
    )

@router.get("", response_model=List[CaseDetailResponse])
def list_cases(db: Session = Depends(get_db)):
    cases = db.query(Case).order_by(Case.created_at.desc()).all()
    return [get_case_detail_response(c, db) for c in cases]

@router.get("/search", response_model=List[CaseDetailResponse])
def search_cases(q: str = "", db: Session = Depends(get_db)):
    query = q.strip().lower()
    if not query:
        cases = db.query(Case).order_by(Case.created_at.desc()).limit(30).all()
    else:
        cases = db.query(Case).filter(
            (Case.defendant_name.ilike(f"%{query}%")) |
            (Case.case_number.ilike(f"%{query}%")) |
            (Case.court_name.ilike(f"%{query}%"))
        ).order_by(Case.created_at.desc()).all()
    return [get_case_detail_response(c, db) for c in cases]

@router.get("/{case_id}", response_model=CaseDetailResponse)
def get_case(case_id: str, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return get_case_detail_response(case, db)

@router.get("/{case_id}/gains-and-losses", response_model=GainsAndLossesBreakdown)
def get_gains_and_losses(case_id: str, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    agreement = case.agreements[0] if case.agreements else None
    if not agreement:
        raise HTTPException(status_code=404, detail="No agreement terms associated with this case.")
    return calculate_gains_and_losses(
        case=case,
        agreement=agreement,
        items=case.payment_plan_items,
        payments=case.payments
    )

@router.put("/{case_id}", response_model=CaseDetailResponse)
def update_case(case_id: str, payload: AgreementUpdateRequest, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    agreement = case.agreements[0] if case.agreements else None
    if not agreement:
        raise HTTPException(status_code=404, detail="No agreement found for this case")

    # Update defendant / case info
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

    # Update agreement terms
    if payload.original_amount is not None and payload.original_amount > 0:
        agreement.original_amount = payload.original_amount
    if payload.currency is not None and payload.currency.strip():
        agreement.currency = payload.currency.upper().strip()
    if payload.payment_amount is not None and payload.payment_amount > 0:
        agreement.payment_amount = payload.payment_amount
    if payload.frequency is not None and payload.frequency.strip():
        agreement.frequency = payload.frequency.lower().strip()
    if payload.start_date is not None and payload.start_date.strip():
        try:
            agreement.start_date = datetime.strptime(payload.start_date.strip(), "%Y-%m-%d").date()
        except Exception:
            pass
    if payload.instalments_count is not None and payload.instalments_count > 0:
        agreement.instalments_count = payload.instalments_count
    if payload.interest_rate is not None:
        agreement.interest_rate = max(0.0, payload.interest_rate)
    if payload.penalty_rate_or_fixed is not None:
        agreement.penalty_rate_or_fixed = max(0.0, payload.penalty_rate_or_fixed)
    if payload.penalty_type is not None:
        agreement.penalty_type = payload.penalty_type
    if payload.grace_period_days is not None:
        agreement.grace_period_days = max(0, payload.grace_period_days)
    if payload.default_conditions is not None:
        agreement.default_conditions = payload.default_conditions
    if payload.exchange_rate is not None:
        agreement.exchange_rate = payload.exchange_rate
    if payload.target_currency is not None:
        agreement.target_currency = payload.target_currency.upper().strip() if payload.target_currency.strip() else None

    # Re-calculate payment_amount if instalments_count or original_amount changed and payment_amount wasn't explicitly supplied
    if (payload.original_amount or payload.instalments_count) and not payload.payment_amount:
        safe_count = max(1, agreement.instalments_count)
        agreement.payment_amount = round(agreement.original_amount / safe_count, 2)

    # Regenerate schedule if requested
    if payload.regenerate_schedule:
        # Delete old plan items
        for p in list(case.payment_plan_items):
            db.delete(p)
        db.flush()

        raw_schedule = generate_schedule_items(
            original_amount=agreement.original_amount,
            start_date=agreement.start_date,
            instalments_count=agreement.instalments_count,
            frequency=agreement.frequency
        )
        plan_items = []
        for item in raw_schedule:
            plan_item = PaymentPlanItem(
                case_id=case.id,
                instalment_number=item["instalment_number"],
                due_date=item["due_date"],
                amount_due=item["amount_due"],
                amount_paid=0.0,
                status=item["status"]
            )
            db.add(plan_item)
            plan_items.append(plan_item)
        db.flush()
    else:
        plan_items = case.payment_plan_items

    # Re-evaluate status & defaults
    case_status, evaluated_items = evaluate_schedule_and_defaults(
        items=plan_items,
        payments=case.payments,
        grace_period_days=agreement.grace_period_days
    )
    case.status = case_status

    # Recalculate balances
    calc = calculate_outstanding_amount(
        case=case,
        agreement=agreement,
        items=evaluated_items,
        payments=case.payments
    )

    calc_record = CalculationRecord(
        case_id=case.id,
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
    db.refresh(case)

    return get_case_detail_response(case, db)

@router.put("/{case_id}/schedule/{item_id}", response_model=CaseDetailResponse)
def update_schedule_item(
    case_id: str,
    item_id: str,
    payload: PaymentPlanItemUpdateRequest,
    db: Session = Depends(get_db)
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    item = db.query(PaymentPlanItem).filter(
        PaymentPlanItem.id == item_id,
        PaymentPlanItem.case_id == case_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Payment plan item not found")

    agreement = case.agreements[0] if case.agreements else None
    if not agreement:
        raise HTTPException(status_code=404, detail="Agreement not found")

    if payload.due_date and payload.due_date.strip():
        try:
            item.due_date = datetime.strptime(payload.due_date.strip(), "%Y-%m-%d").date()
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD.")

    if payload.amount_due is not None and payload.amount_due >= 0:
        item.amount_due = payload.amount_due

    if payload.notes is not None:
        item.notes = payload.notes

    db.flush()

    # Re-evaluate
    case_status, evaluated_items = evaluate_schedule_and_defaults(
        items=case.payment_plan_items,
        payments=case.payments,
        grace_period_days=agreement.grace_period_days
    )
    case.status = case_status

    calc = calculate_outstanding_amount(
        case=case,
        agreement=agreement,
        items=evaluated_items,
        payments=case.payments
    )

    calc_record = CalculationRecord(
        case_id=case.id,
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
    db.refresh(case)

    return get_case_detail_response(case, db)

@router.delete("/{case_id}")
def delete_case(case_id: str, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    db.delete(case)
    db.commit()
    return {"message": "Case deleted successfully"}
