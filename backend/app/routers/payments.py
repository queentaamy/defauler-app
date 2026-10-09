import json
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Case, Payment, CalculationRecord, Agreement
from app.schemas import PaymentCreateRequest, CaseDetailResponse
from app.services.calculation_engine import (
    evaluate_schedule_and_defaults, 
    calculate_outstanding_amount,
    evaluate_settlement_checkpoints
)
from app.routers.cases import get_case_detail_response

router = APIRouter(prefix="/api/payments", tags=["Payments"])

@router.post("/{case_id}", response_model=CaseDetailResponse)
def record_payment(case_id: str, payload: PaymentCreateRequest, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Account not found")

    try:
        payment_date_obj = datetime.strptime(payload.payment_date, "%Y-%m-%d").date()
    except Exception:
        payment_date_obj = date.today()

    # 1. Create Payment record
    new_payment = Payment(
        case_id=case.id,
        payment_plan_id=payload.payment_plan_id,
        checkpoint_id=payload.checkpoint_id,
        amount=payload.amount,
        payment_date=payment_date_obj,
        currency=payload.currency.upper(),
        payment_reference=payload.payment_reference,
        local_amount_paid=payload.local_amount_paid,
        local_currency=payload.local_currency,
        exchange_rate_applied=payload.exchange_rate_applied,
        notes=payload.notes
    )
    db.add(new_payment)
    db.flush()

    # 2. Update Checkpoints if any
    all_payments = case.payments
    for cp in case.checkpoints:
        cp.actually_paid_by_then = round(sum(p.amount for p in all_payments if p.payment_date <= cp.due_date), 2)
        if cp.actually_paid_by_then >= cp.cumulative_required:
            cp.status = "met"
        elif date.today() > cp.due_date:
            cp.status = "missed"
        else:
            cp.status = "not_due"

    # Evaluate settlement breach
    if case.account_type == "settlement" or len(case.checkpoints) > 0:
        settlement_eval = evaluate_settlement_checkpoints(case, case.checkpoints, all_payments)
        if settlement_eval.is_breached:
            case.status = "breached"
            case.is_breached = True
        elif settlement_eval.status == "FULLY SETTLED":
            case.status = "settled"

    # 3. Update payment plan items if any
    agreement = case.agreements[0] if case.agreements else None
    if agreement and len(case.payment_plan_items) > 0:
        case_status, evaluated_items = evaluate_schedule_and_defaults(
            items=case.payment_plan_items,
            payments=all_payments,
            grace_period_days=agreement.grace_period_days,
            eval_date=date.today()
        )
        if not case.is_breached:
            case.status = case_status

        calc = calculate_outstanding_amount(
            case=case,
            agreement=agreement,
            items=evaluated_items,
            payments=all_payments,
            calc_date=date.today()
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
