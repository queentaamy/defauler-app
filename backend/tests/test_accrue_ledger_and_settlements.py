import pytest
from datetime import date
from fastapi.testclient import TestClient
from app.main import app
from app.models import Case, InterestRateTranche, PaymentCheckpoint, CurrencyGainLossItem, Payment
from app.services.calculation_engine import (
    generate_monthly_ledger,
    evaluate_settlement_checkpoints,
    calculate_fx_gain_loss
)

client = TestClient(app)

def test_monthly_ledger_day_count_and_interest_calculation():
    """
    Tests the exact day-count simple interest formulas matching Image 1:
    Judgment debt: ₵200,000.00, All-in rate: 16.20%, Method: Simple (30/360).
    - 28 days: 200,000 * 0.162 * (28/360) = ₵2,520.00
    - 31 days: 200,000 * 0.162 * (31/360) = ₵2,790.00
    - 30 days: 200,000 * 0.162 * (30/360) = ₵2,700.00
    """
    case = Case(
        case_number="HC/2018/ACCRA/001",
        account_type="judgment_debt",
        plaintiff_name="Universal Merchant Bank",
        defendant_name="Ghana Commercial Debtor",
        currency="GHS",
        settlement_total=200000.0,
        judgment_date=date(2022, 1, 31),
        cost_awarded=0.0,
        interest_method="simple_30_360"
    )

    tranche = InterestRateTranche(
        case_id="dummy",
        effective_from=date(2018, 1, 1),
        base_rate=16.20,
        spread=0.0,
        penal_rate=0.0,
        all_in_rate=16.20
    )

    # Calculate up to 30 April 2022 (covers 3 months: Feb [28d], March [31d], April [30d])
    as_of = date(2022, 4, 30)
    ledger = generate_monthly_ledger(case, [tranche], [], as_of)

    assert ledger.currency == "GHS"
    assert ledger.judgment_debt == 200000.0
    assert len(ledger.rows) >= 3

    # Row 1: Feb 2022 (28 days) -> interest = 2,520.00
    r1 = ledger.rows[0]
    assert r1.days == 28
    assert r1.all_in_rate == 16.20
    assert r1.interest_due == 2520.00

    # Row 2: March 2022 (31 days) -> interest = 2,790.00
    r2 = ledger.rows[1]
    assert r2.days == 31
    assert r2.interest_due == 2790.00

    # Row 3: April 2022 (30 days) -> interest = 2,700.00
    r3 = ledger.rows[2]
    assert r3.days == 30
    assert r3.interest_due == 2700.00

    # Cumulative interest after 3 months = 2520 + 2790 + 2700 = 8010.00
    assert ledger.rows[2].cumulative_interest == 8010.00

def test_settlement_checkpoint_breach_detection_and_reinstatement():
    """
    Tests settlement account checkpoint evaluation matching Image 2 & Image 5:
    Settlement total: $6,000,000.00
    Reinstatement amount: $8,256,340.67 @ 12% p.a.
    Checkpoints:
    - 30 Apr 2022: $500,000.00 cumulative
    - 31 Jul 2022: $1,000,000.00 cumulative
    """
    case = Case(
        case_number="SET/2022/ACCRA/094",
        account_type="settlement",
        plaintiff_name="Universal Merchant Bank",
        defendant_name="Ghana Alu Ltd",
        currency="USD",
        settlement_total=6000000.0,
        reinstatement_amount=8256340.67,
        reinstatement_interest_rate=12.0,
        interest_accrual_start_date=date(2022, 4, 30)
    )

    cp1 = PaymentCheckpoint(
        id="cp-1",
        case_id="case-1",
        checkpoint_number=1,
        due_date=date(2022, 4, 30),
        cumulative_required=500000.0,
        amount_required=500000.0,
        status="not_due"
    )
    cp2 = PaymentCheckpoint(
        id="cp-2",
        case_id="case-1",
        checkpoint_number=2,
        due_date=date(2022, 7, 31),
        cumulative_required=1000000.0,
        amount_required=500000.0,
        status="not_due"
    )

    # 1. Evaluate as of 1 Jan 2022 (before any checkpoint is due) -> ON TRACK
    eval_early = evaluate_settlement_checkpoints(case, [cp1, cp2], [], date(2022, 1, 1))
    assert eval_early.is_breached is False
    assert eval_early.status == "ON TRACK"
    assert eval_early.remaining_under_settlement == 6000000.0
    assert eval_early.next_checkpoint_target == 500000.0

    # 2. Evaluate as of 1 May 2022 with $0 paid (30 Apr missed!) -> SETTLEMENT BREACHED
    eval_breached = evaluate_settlement_checkpoints(case, [cp1, cp2], [], date(2022, 5, 1))
    assert eval_breached.is_breached is True
    assert eval_breached.status == "SETTLEMENT BREACHED"
    assert "30 Apr 2022" in eval_breached.status_message
    assert "needed USD 500,000.00" in eval_breached.status_message
    assert eval_breached.reinstated_amount_due is not None
    assert eval_breached.reinstated_amount_due >= 8256340.67

def test_currency_gain_loss_calculation():
    """
    Tests currency gain/loss on payments matching Image 4 figures:
    - Obligation 30 Apr 2022 ($500k) paid 30 Jun 2022 @ 7.1128 due vs 7.2245 paid -> -55,850.00 GHS
    - Obligation 31 Jul 2022 ($500k) paid 30 Sept 2022 @ 7.6120 due vs 9.5585 paid -> -973,250.00 GHS
    - Total impact: -1,029,100.00 GHS
    """
    case = Case(
        case_number="SET/2022/ACCRA/094",
        currency="USD"
    )

    fx1 = CurrencyGainLossItem(
        id="fx-1",
        case_id="case-1",
        obligation_due_date=date(2022, 4, 30),
        amount_contract_curr=500000.0,
        payment_date=date(2022, 6, 30),
        due_date_rate=7.1128,
        actual_payment_rate=7.2245,
        local_currency="GHS"
    )
    fx2 = CurrencyGainLossItem(
        id="fx-2",
        case_id="case-1",
        obligation_due_date=date(2022, 7, 31),
        amount_contract_curr=500000.0,
        payment_date=date(2022, 9, 30),
        due_date_rate=7.6120,
        actual_payment_rate=9.5585,
        local_currency="GHS"
    )

    res = calculate_fx_gain_loss(case, [fx1, fx2])
    assert res.total_currency_impact == -1029100.00
    assert res.items[0].local_currency_impact == -55850.00
    assert res.items[1].local_currency_impact == -973250.00

def test_api_create_settlement_and_backup_endpoints():
    """Tests creating a settlement account via API and downloading full backup."""
    payload = {
        "defendant_name": "Accrue Test Enterprise",
        "currency": "USD",
        "settlement_total": 500000.0,
        "reinstatement_amount": 750000.0,
        "reinstatement_interest_rate": 10.0,
        "interest_accrual_start_date": "2026-05-01",
        "checkpoints": [
            {
                "checkpoint_number": 1,
                "due_date": "2026-06-01",
                "cumulative_required": 250000.0,
                "amount_required": 250000.0
            },
            {
                "checkpoint_number": 2,
                "due_date": "2026-07-01",
                "cumulative_required": 500000.0,
                "amount_required": 250000.0
            }
        ]
    }
    res = client.post("/api/cases/settlement", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["defendant_name"] == "Accrue Test Enterprise"
    assert data["account_type"] == "settlement"
    assert data["settlement_total"] == 500000.0
    assert len(data["checkpoints"]) == 2

    # Test full backup export
    backup_res = client.get("/api/cases/export/backup")
    assert backup_res.status_code == 200
    b_data = backup_res.json()
    assert "accounts" in b_data
    assert b_data["total_accounts"] >= 1
