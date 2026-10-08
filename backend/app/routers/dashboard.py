from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Case, PaymentPlanItem, CalculationRecord
from app.schemas import DashboardStatsResponse

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(db: Session = Depends(get_db)):
    cases = db.query(Case).all()
    total_cases = len(cases)
    
    active_plans = db.query(Case).filter(Case.status == "active").count()
    defaulted_cases = db.query(Case).filter(Case.status == "defaulted").count()
    overdue_payments = db.query(PaymentPlanItem).filter(PaymentPlanItem.status == "overdue").count()

    total_outstanding = 0.0
    for case in cases:
        if case.calculation_records:
            # Most recent calculation
            latest = case.calculation_records[0]
            total_outstanding += latest.total_amount_owed
        elif case.agreements:
            total_outstanding += case.agreements[0].original_amount

    # Recent cases
    recent_cases = []
    for c in cases[:10]:
        agr = c.agreements[0] if c.agreements else None
        latest_calc = c.calculation_records[0] if c.calculation_records else None
        
        recent_cases.append({
            "id": c.id,
            "case_number": c.case_number,
            "defendant_name": c.defendant_name,
            "status": c.status,
            "original_amount": agr.original_amount if agr else 0.0,
            "currency": agr.currency if agr else "USD",
            "current_owed": latest_calc.total_amount_owed if latest_calc else (agr.original_amount if agr else 0.0),
            "created_at": str(c.created_at)
        })

    return DashboardStatsResponse(
        total_cases=total_cases,
        active_plans=active_plans,
        overdue_payments=overdue_payments,
        defaulted_cases=defaulted_cases,
        total_outstanding_amount=round(total_outstanding, 2),
        currency="USD",
        recent_cases=recent_cases
    )
