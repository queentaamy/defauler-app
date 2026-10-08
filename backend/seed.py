from datetime import date, timedelta
from app.database import SessionLocal, init_db
from app.models import Case, Agreement, PaymentPlanItem, Payment, CalculationRecord
from app.config import settings
from app.services.calculation_engine import generate_schedule_items, evaluate_schedule_and_defaults, calculate_outstanding_amount
import json

def seed():
    init_db()
    db = SessionLocal()
    
    # Check if cases already exist
    if db.query(Case).count() > 0:
        print("Database already contains cases. Skipping seed.")
        db.close()
        return

    print("Seeding sample court order cases...")

    # Case 1: Active Case (Kofi Mensah - Paying on Schedule)
    case1 = Case(
        case_number="HC/2026/ACCRA/014",
        court_name="High Court of Justice (Commercial Division), Accra",
        plaintiff_name=settings.DEFAULT_PLAINTIFF_NAME,
        plaintiff_address=settings.DEFAULT_PLAINTIFF_ADDRESS,
        plaintiff_contact=settings.DEFAULT_PLAINTIFF_CONTACT,
        defendant_name="Kofi Mensah",
        defendant_address="Plot 12 Ring Road Central, Accra",
        defendant_contact="+233 24 555 0101",
        status="active"
    )
    db.add(case1)
    db.flush()

    agr1 = Agreement(
        case_id=case1.id,
        document_name="Consent_Order_Mensah.pdf",
        document_type="pdf",
        original_amount=24000.0,
        currency="USD",
        payment_amount=4000.0,
        frequency="monthly",
        start_date=date.today() - timedelta(days=60),
        instalments_count=6,
        interest_rate=5.0,
        penalty_rate_or_fixed=2.0,
        penalty_type="percentage",
        grace_period_days=7,
        default_conditions="Default occurs if payment is unpaid after 7 days grace. 2% penalty on arrears.",
        exchange_rate=1.0,
        target_currency="USD"
    )
    db.add(agr1)
    db.flush()

    raw_items1 = generate_schedule_items(agr1.original_amount, agr1.start_date, agr1.instalments_count, agr1.frequency)
    items1 = [PaymentPlanItem(case_id=case1.id, **item) for item in raw_items1]
    db.add_all(items1)
    db.flush()

    # Record 2 successful payments
    pmt1_1 = Payment(
        case_id=case1.id,
        amount=4000.0,
        payment_date=agr1.start_date,
        currency="USD",
        payment_reference="BANK-TR-10023",
        notes="First instalment - full payment"
    )
    pmt1_2 = Payment(
        case_id=case1.id,
        amount=4000.0,
        payment_date=agr1.start_date + timedelta(days=30),
        currency="USD",
        payment_reference="BANK-TR-10089",
        notes="Second instalment - full payment"
    )
    db.add_all([pmt1_1, pmt1_2])
    db.flush()

    status1, eval_items1 = evaluate_schedule_and_defaults(items1, [pmt1_1, pmt1_2], agr1.grace_period_days)
    case1.status = status1
    calc1 = calculate_outstanding_amount(case1, agr1, eval_items1, [pmt1_1, pmt1_2])
    rec1 = CalculationRecord(
        case_id=case1.id,
        original_amount=calc1.original_amount,
        total_paid=calc1.total_paid,
        outstanding_principal=calc1.outstanding_principal,
        accrued_interest=calc1.accrued_interest,
        default_interest_or_penalty=calc1.default_interest_or_penalty,
        exchange_rate=calc1.exchange_rate,
        currency=calc1.currency,
        target_currency=calc1.target_currency,
        total_amount_owed=calc1.total_amount_owed,
        breakdown_json=json.dumps(calc1.step_by_step_log)
    )
    db.add(rec1)

    # Case 2: Defaulted Case (Kwaku Owusu - Defaulted with Accrued Interest & Penalty)
    case2 = Case(
        case_number="DC/2026/KUMASI/088",
        court_name="Circuit Court, Kumasi",
        plaintiff_name=settings.DEFAULT_PLAINTIFF_NAME,
        plaintiff_address=settings.DEFAULT_PLAINTIFF_ADDRESS,
        plaintiff_contact=settings.DEFAULT_PLAINTIFF_CONTACT,
        defendant_name="Kwaku Owusu",
        defendant_address="Adum Commercial Area, Kumasi",
        defendant_contact="+233 20 777 9922",
        status="defaulted"
    )
    db.add(case2)
    db.flush()

    agr2 = Agreement(
        case_id=case2.id,
        document_name="Owusu_Settlement_Deed.docx",
        document_type="docx",
        original_amount=15000.0,
        currency="USD",
        payment_amount=5000.0,
        frequency="monthly",
        start_date=date.today() - timedelta(days=90),
        instalments_count=3,
        interest_rate=8.0,
        penalty_rate_or_fixed=5.0,
        penalty_type="percentage",
        grace_period_days=5,
        default_conditions="5% penalty applied on overdue instalments past 5 days grace.",
        exchange_rate=1.0,
        target_currency="USD"
    )
    db.add(agr2)
    db.flush()

    raw_items2 = generate_schedule_items(agr2.original_amount, agr2.start_date, agr2.instalments_count, agr2.frequency)
    items2 = [PaymentPlanItem(case_id=case2.id, **item) for item in raw_items2]
    db.add_all(items2)
    db.flush()

    # Record 1 payment of 5,000, but remaining 10,000 defaulted
    pmt2 = Payment(
        case_id=case2.id,
        amount=5000.0,
        payment_date=agr2.start_date,
        currency="USD",
        payment_reference="MOMO-TX-44019",
        notes="Instalment 1 paid, subsequent defaulted"
    )
    db.add(pmt2)
    db.flush()

    status2, eval_items2 = evaluate_schedule_and_defaults(items2, [pmt2], agr2.grace_period_days)
    case2.status = status2
    calc2 = calculate_outstanding_amount(case2, agr2, eval_items2, [pmt2])
    rec2 = CalculationRecord(
        case_id=case2.id,
        original_amount=calc2.original_amount,
        total_paid=calc2.total_paid,
        outstanding_principal=calc2.outstanding_principal,
        accrued_interest=calc2.accrued_interest,
        default_interest_or_penalty=calc2.default_interest_or_penalty,
        exchange_rate=calc2.exchange_rate,
        currency=calc2.currency,
        target_currency=calc2.target_currency,
        total_amount_owed=calc2.total_amount_owed,
        breakdown_json=json.dumps(calc2.step_by_step_log)
    )
    db.add(rec2)

    db.commit()
    print("Seed completed successfully!")
    db.close()

if __name__ == "__main__":
    seed()
