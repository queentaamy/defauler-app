import os
import io
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    yield
    # Cleanup tables after test run
    Base.metadata.drop_all(bind=engine)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

def test_upload_and_extraction():
    # Test uploading a text document as txt/doc
    sample_text = """
    IN THE HIGH COURT OF JUSTICE
    SUIT NO: HC/2026/ACCRA/094
    BETWEEN:
    [PLAINTIFF NAME] (Plaintiff)
    AND
    Kofi Mensah (Defendant)
    
    CONSENT ORDER AND PAYMENT AGREEMENT
    1. The Defendant shall pay to the Plaintiff the sum of USD 12,000.00.
    2. The amount shall be paid in 4 equal monthly instalments of USD 3,000.00.
    3. The first instalment shall be paid on 2026-04-01.
    4. Interest of 6% per annum shall apply.
    5. In event of default, a penalty of 5% on arrears shall apply after 5 days grace period.
    """
    file_bytes = sample_text.encode("utf-8")
    response = client.post(
        "/api/documents/upload",
        files={"file": ("court_order.txt", io.BytesIO(file_bytes), "text/plain")}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["case_number"] == "HC/2026/ACCRA/094"
    assert "Kofi Mensah" in data["defendant_name"]
    assert data["original_amount"] == 12000.0
    assert data["currency"] == "USD"
    assert data["instalments_count"] == 4
    assert data["interest_rate"] == 6.0

def test_full_court_order_lifecycle():
    # 1. Create Case from extracted data
    case_payload = {
        "case_number": "HC/2026/TEST/001",
        "court_name": "Commercial Court",
        "defendant_name": "Ama Serwaa",
        "defendant_address": "14 Airport Residential Area, Accra",
        "defendant_contact": "+233 24 000 1111",
        "original_amount": 6000.0,
        "currency": "USD",
        "payment_amount": 2000.0,
        "frequency": "monthly",
        "start_date": "2026-01-01",
        "instalments_count": 3,
        "interest_rate": 8.0,
        "penalty_rate_or_fixed": 5.0,
        "penalty_type": "percentage",
        "grace_period_days": 5,
        "default_conditions": "5% penalty on overdue arrears after 5 days grace period",
        "exchange_rate": 1.0
    }
    
    create_resp = client.post("/api/cases", json=case_payload)
    assert create_resp.status_code == 200
    case_data = create_resp.json()
    case_id = case_data["id"]
    
    # Verify fixed Plaintiff info automatically attached
    assert case_data["plaintiff_name"] == "[PLAINTIFF NAME]"
    assert case_data["defendant_name"] == "Ama Serwaa"
    assert len(case_data["payment_plans"]) == 3
    assert case_data["status"] == "defaulted" # Because Jan 1, Feb 1, Mar 1 have passed and no payment yet!
    assert case_data["latest_calculation"]["outstanding_principal"] == 6000.0
    assert case_data["latest_calculation"]["default_interest_or_penalty"] > 0

    # 2. Record Payment of $2,000
    pmt_payload = {
        "amount": 2000.0,
        "payment_date": "2026-01-03",
        "currency": "USD",
        "payment_reference": "BANK-TX-99881",
        "notes": "First instalment payment by defendant"
    }
    pmt_resp = client.post(f"/api/payments/{case_id}", json=pmt_payload)
    assert pmt_resp.status_code == 200
    updated_case = pmt_resp.json()
    assert len(updated_case["payments"]) == 1
    assert updated_case["payment_plans"][0]["status"] == "paid"
    assert updated_case["latest_calculation"]["total_paid"] == 2000.0
    assert updated_case["latest_calculation"]["outstanding_principal"] == 4000.0

    # 3. Check Dashboard Stats
    dash_resp = client.get("/api/dashboard/stats")
    assert dash_resp.status_code == 200
    stats = dash_resp.json()
    assert stats["total_cases"] == 1
    assert stats["total_outstanding_amount"] > 4000.0

    # 4. Check Calculation Audit History
    calc_hist_resp = client.get(f"/api/calculations/{case_id}/history")
    assert calc_hist_resp.status_code == 200
    records = calc_hist_resp.json()
    assert len(records) >= 2 # Initial calc + payment calc
    assert records[0]["outstanding_principal"] == 4000.0
