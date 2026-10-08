import json
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Case, Payment, CalculationRecord
from app.schemas import PaymentCreateRequest, CaseDetailResponse
from app.services.calculation_engine import evaluate_schedule_and_defaults, calculate_outstanding_amount
from app.routers.cases import get_case_detail_response

router = APIRouter(prefix="/api/payments", tags=["Payments"])

@router.post("/{case_id}", response_model=CaseDetailResponse)
def record_payment(case_id: str, payload: PaymentCreateRequest, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    agreement = case.agreements[0] if case.agreements else None
    if not agreement:
        raise HTTPException(status_code=400, detail="Case does not have an active agreement")

    try:
        payment_date_obj = datetime.strptime(payload.payment_date, "%Y-%m-%d").date()
    except Exception:
        payment_date_obj = date.today()

    # 1. Create Payment record
    new_payment = Payment(
        case_id=case.id,
        payment_plan_id=payload.payment_plan_id,
        amount=payload.amount,
        payment_date=payment_date_obj,
        currency=payload.currency.upper(),
        payment_reference=payload.payment_reference,
        notes=payload.notes
    )
    db.add(new_payment)
    db.flush()

    # 2. Re-evaluate payment schedule items and detect defaults
    all_payments = case.payments
    case_status, evaluated_items = evaluate_schedule_and_defaults(
        items=case.payment_plan_items,
        payments=all_payments,
        grace_period_days=agreement.grace_period_days,
        eval_date=date.today()
    )
    case.status = case_status

    # 3. Deterministically compute outstanding amount, interest, penalties
    calc = calculate_outstanding_amount(
        case=case,
        agreement=agreement,
        items=evaluated_items,
        payments=all_payments,
        calc_date=date.today()
    )

    # 4. Save audit calculation record
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
