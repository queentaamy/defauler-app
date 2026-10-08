import json
from datetime import date
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Case, CalculationRecord
from app.schemas import CalculationBreakdown
from app.services.calculation_engine import evaluate_schedule_and_defaults, calculate_outstanding_amount
from app.routers.cases import get_case_detail_response

router = APIRouter(prefix="/api/calculations", tags=["Calculations"])

@router.post("/{case_id}/recalculate", response_model=CalculationBreakdown)
def recalculate(case_id: str, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    agreement = case.agreements[0] if case.agreements else None
    if not agreement:
        raise HTTPException(status_code=400, detail="Case does not have an active agreement")

    # Evaluate schedule status
    case_status, evaluated_items = evaluate_schedule_and_defaults(
        items=case.payment_plan_items,
        payments=case.payments,
        grace_period_days=agreement.grace_period_days,
        eval_date=date.today()
    )
    case.status = case_status

    calc = calculate_outstanding_amount(
        case=case,
        agreement=agreement,
        items=evaluated_items,
        payments=case.payments,
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

    return calc

@router.get("/{case_id}/history", response_model=List[CalculationBreakdown])
def get_calculation_history(case_id: str, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    records = db.query(CalculationRecord).filter(CalculationRecord.case_id == case_id).order_by(CalculationRecord.calculation_date.desc()).all()
    
    result = []
    for r in records:
        result.append(CalculationBreakdown(
            original_amount=r.original_amount,
            total_paid=r.total_paid,
            outstanding_principal=r.outstanding_principal,
            accrued_interest=r.accrued_interest,
            default_interest_or_penalty=r.default_interest_or_penalty,
            exchange_rate=r.exchange_rate,
            currency=r.currency,
            target_currency=r.target_currency,
            total_amount_owed=r.total_amount_owed,
            step_by_step_log=json.loads(r.breakdown_json) if r.breakdown_json else [],
            calculation_date=str(r.calculation_date)
        ))
    return result
