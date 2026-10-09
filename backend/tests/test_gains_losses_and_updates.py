import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_terms_only_creation_auto_generates_case_number():
    """Test that uploading/entering terms of agreement only (no court case number) auto-generates a reference."""
    payload = {
        "case_number": "",  # omitted / blank
        "court_name": "",   # optional
        "defendant_name": "Accra Timber Supplies Ltd",
        "defendant_address": "Plot 14 Industrial Area, Accra",
        "defendant_contact": "+233 24 000 1111",
        "original_amount": 30000.0,
        "currency": "USD",
        "payment_amount": 5000.0,
        "frequency": "monthly",
        "start_date": "2026-01-15",
        "instalments_count": 6,
        "interest_rate": 6.0,
        "penalty_rate_or_fixed": 3.0,
        "penalty_type": "percentage",
        "grace_period_days": 5,
        "default_conditions": "In event of default on any instalment, 3% penalty applies."
    }
    res = client.post("/api/cases", json=payload)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["defendant_name"] == "Accra Timber Supplies Ltd"
    # Case number should be auto-generated with AGR prefix
    assert data["case_number"].startswith("AGR-")
    assert len(data["payment_plans"]) == 6
    assert data["gains_and_losses"] is not None
    assert data["gains_and_losses"]["total_agreed"] == 30000.0

def test_search_cases_by_defendant_name():
    """Test searching for defendant accounts by name."""
    client.post("/api/cases", json={
        "defendant_name": "Timber Logistics Ltd",
        "original_amount": 10000.0,
        "currency": "USD",
        "start_date": "2026-02-01",
        "instalments_count": 2,
    })
    res = client.get("/api/cases/search?q=Timber")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 1
    assert any("Timber" in c["defendant_name"] for c in data)

def test_update_case_agreement_terms():
    """Test modifying agreement terms and defendant account information."""
    # First create
    payload = {
        "defendant_name": "Kumasi Logistics Co",
        "original_amount": 20000.0,
        "currency": "GHS",
        "start_date": "2026-03-01",
        "instalments_count": 4,
        "interest_rate": 0.0,
        "penalty_rate_or_fixed": 5.0,
        "penalty_type": "percentage",
        "grace_period_days": 7
    }
    create_res = client.post("/api/cases", json=payload)
    assert create_res.status_code == 200
    case_id = create_res.json()["id"]

    # Now modify terms (increase amount, change interest, regenerate schedule)
    update_payload = {
        "defendant_name": "Kumasi Logistics Consolidated",
        "original_amount": 25000.0,
        "interest_rate": 4.5,
        "instalments_count": 5,
        "regenerate_schedule": True
    }
    update_res = client.put(f"/api/cases/{case_id}", json=update_payload)
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["defendant_name"] == "Kumasi Logistics Consolidated"
    assert updated_data["agreement"]["original_amount"] == 25000.0
    assert updated_data["agreement"]["interest_rate"] == 4.5
    assert updated_data["agreement"]["instalments_count"] == 5
    assert len(updated_data["payment_plans"]) == 5

def test_gains_and_losses_calculation_for_defaulted_period():
    """Test calculation of gains and losses when someone does not pay for a period and defaults."""
    # Past date so instalments are overdue and defaulted
    past_date = "2025-01-01"
    payload = {
        "defendant_name": "Defaulting Debtor Corp",
        "original_amount": 10000.0,
        "currency": "USD",
        "start_date": past_date,
        "instalments_count": 2,
        "interest_rate": 10.0,
        "penalty_rate_or_fixed": 5.0,
        "penalty_type": "percentage",
        "grace_period_days": 7
    }
    create_res = client.post("/api/cases", json=payload)
    assert create_res.status_code == 200
    case_id = create_res.json()["id"]

    # Check dedicated gains-and-losses endpoint
    gnl_res = client.get(f"/api/cases/{case_id}/gains-and-losses")
    assert gnl_res.status_code == 200
    gnl = gnl_res.json()

    assert gnl["has_defaulted"] is True
    assert gnl["defaulted_periods_count"] >= 1
    # Cash flow shortfall should be positive (unpaid instalments that were due)
    assert gnl["cash_flow_shortfall"] > 0
    # Creditor gains / debtor penalty loss should reflect the 5% penalty + interest
    assert gnl["total_default_penalties"] > 0
    assert gnl["total_creditor_gains"] > 0
    assert gnl["total_debtor_penalty_loss"] > 0
    assert gnl["total_current_owed"] > 10000.0
    # Verify period items
    assert len(gnl["periods"]) == 2
    p1 = gnl["periods"][0]
    assert p1["is_defaulted"] is True
    assert p1["shortfall"] == 5000.0
    assert p1["period_penalty"] > 0
