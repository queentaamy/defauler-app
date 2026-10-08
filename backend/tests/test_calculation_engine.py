import pytest
from datetime import date, timedelta
from app.models import Case, Agreement, PaymentPlanItem, Payment
from app.services.calculation_engine import (
    generate_schedule_items,
    evaluate_schedule_and_defaults,
    calculate_outstanding_amount
)

def test_generate_schedule_items_exact_cents():
    """Verify that instalment amounts sum to the original amount to the exact cent."""
    original_amount = 1000.00
    start_date = date(2026, 1, 1)
    instalments = 3
    items = generate_schedule_items(original_amount, start_date, instalments, "monthly")
    
    assert len(items) == 3
    total_due = sum(item["amount_due"] for item in items)
    assert total_due == pytest.approx(1000.00, 0.001)
    # Check 1000 / 3 = 333.33 + 333.33 + 333.34
    assert items[0]["amount_due"] == 333.33
    assert items[1]["amount_due"] == 333.33
    assert items[2]["amount_due"] == 333.34

def test_evaluate_defaults_on_time_full_payment():
    """Verify full payment on time results in 'settled' and 'paid' items."""
    plan_items = [
        PaymentPlanItem(instalment_number=1, due_date=date(2026, 1, 15), amount_due=500.0, amount_paid=0.0, status="upcoming"),
        PaymentPlanItem(instalment_number=2, due_date=date(2026, 2, 15), amount_due=500.0, amount_paid=0.0, status="upcoming"),
    ]
    payments = [
        Payment(amount=1000.0, payment_date=date(2026, 1, 10), currency="USD", payment_reference="REF-001")
    ]
    
    status, evaluated = evaluate_schedule_and_defaults(plan_items, payments, grace_period_days=5, eval_date=date(2026, 2, 1))
    assert status == "settled"
    assert evaluated[0].status == "paid"
    assert evaluated[1].status == "paid"
    assert evaluated[0].amount_paid == 500.0
    assert evaluated[1].amount_paid == 500.0

def test_evaluate_defaults_missed_payment():
    """Verify missed payment past grace period triggers defaulted status."""
    plan_items = [
        PaymentPlanItem(instalment_number=1, due_date=date(2026, 1, 1), amount_due=500.0, amount_paid=0.0, status="upcoming"),
        PaymentPlanItem(instalment_number=2, due_date=date(2026, 2, 1), amount_due=500.0, amount_paid=0.0, status="upcoming"),
    ]
    payments = [] # No payments
    
    # Evaluate on Jan 15 (14 days late, grace is 7 days) -> defaulted
    status, evaluated = evaluate_schedule_and_defaults(plan_items, payments, grace_period_days=7, eval_date=date(2026, 1, 15))
    assert status == "defaulted"
    assert evaluated[0].status == "defaulted"
    assert evaluated[1].status == "upcoming"

def test_calculation_engine_deterministic_formula():
    """Verify deterministic financial formula: Outstanding = Principal - Payments + Interest + Penalties."""
    case = Case(
        case_number="CASE-TEST-1",
        plaintiff_name="Plaintiff LLC",
        defendant_name="John Doe",
        status="defaulted"
    )
    agreement = Agreement(
        original_amount=10000.0,
        currency="USD",
        payment_amount=2000.0,
        frequency="monthly",
        start_date=date(2026, 1, 1),
        instalments_count=5,
        interest_rate=10.0, # 10% per annum
        penalty_rate_or_fixed=5.0, # 5% penalty on overdue arrears
        penalty_type="percentage",
        grace_period_days=5,
        exchange_rate=1.0,
        target_currency="USD"
    )
    
    plan_items = [
        PaymentPlanItem(instalment_number=1, due_date=date(2026, 1, 1), amount_due=2000.0, amount_paid=2000.0, status="paid"),
        PaymentPlanItem(instalment_number=2, due_date=date(2026, 2, 1), amount_due=2000.0, amount_paid=0.0, status="defaulted"),
        PaymentPlanItem(instalment_number=3, due_date=date(2026, 3, 1), amount_due=2000.0, amount_paid=0.0, status="upcoming"),
    ]
    payments = [
        Payment(amount=2000.0, payment_date=date(2026, 1, 1), currency="USD", payment_reference="REF-TEST")
    ]
    
    # Run calculation on day 100 of the year
    calc_date = date(2026, 1, 1) + timedelta(days=100)
    calc = calculate_outstanding_amount(case, agreement, plan_items, payments, calc_date=calc_date)
    
    assert calc.original_amount == 10000.0
    assert calc.total_paid == 2000.0
    assert calc.outstanding_principal == 8000.0
    
    # Expected interest: 8000 * 0.10 * (100 / 365) = 219.18
    expected_interest = round(8000.0 * 0.10 * (100 / 365.0), 2)
    assert calc.accrued_interest == expected_interest
    
    # Overdue arrears for instalment 2 = 2000.0. 5% penalty = 100.00
    assert calc.default_interest_or_penalty == 100.00
    
    expected_total = 8000.0 + expected_interest + 100.00
    assert calc.total_amount_owed == expected_total
    assert len(calc.step_by_step_log) >= 5

def test_currency_conversion():
    """Verify currency conversion with exchange rate rule."""
    case = Case(case_number="CASE-FX", plaintiff_name="Creditor", defendant_name="Debtor", status="active")
    agreement = Agreement(
        original_amount=5000.0,
        currency="USD",
        payment_amount=5000.0,
        frequency="lump_sum",
        start_date=date(2026, 1, 1),
        instalments_count=1,
        interest_rate=0.0,
        penalty_rate_or_fixed=0.0,
        penalty_type="none",
        grace_period_days=0,
        exchange_rate=15.5, # 1 USD = 15.50 GHS
        target_currency="GHS"
    )
    plan_items = [
        PaymentPlanItem(instalment_number=1, due_date=date(2026, 1, 1), amount_due=5000.0, amount_paid=0.0, status="upcoming")
    ]
    calc = calculate_outstanding_amount(case, agreement, plan_items, [], calc_date=date(2026, 1, 1))
    
    assert calc.currency == "USD"
    assert calc.target_currency == "GHS"
    assert calc.outstanding_principal == 5000.0
    # 5000 * 15.5 = 77,500.00
    assert calc.total_amount_owed == 77500.0
