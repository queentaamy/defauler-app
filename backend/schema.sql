-- Court Order & Payment Agreement Defaulter App Database Schema (PostgreSQL / Supabase)

-- 1. Cases Table
CREATE TABLE IF NOT EXISTS cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_number VARCHAR(100) NOT NULL,
    court_name VARCHAR(200),
    plaintiff_name VARCHAR(200) NOT NULL DEFAULT 'Universal Merchant Bank',
    plaintiff_address TEXT DEFAULT '[PLAINTIFF ADDRESS]',
    plaintiff_contact VARCHAR(100) DEFAULT '[PLAINTIFF CONTACT]',
    defendant_name VARCHAR(200) NOT NULL,
    defendant_address TEXT,
    defendant_contact VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'overdue', 'defaulted', 'settled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cases_case_number ON cases(case_number);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);

-- 2. Agreements Table
CREATE TABLE IF NOT EXISTS agreements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    document_name VARCHAR(255),
    document_type VARCHAR(50),
    file_path TEXT,
    original_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    payment_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    frequency VARCHAR(50) NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('monthly', 'weekly', 'biweekly', 'quarterly', 'lump_sum')),
    start_date DATE NOT NULL,
    instalments_count INTEGER NOT NULL DEFAULT 1,
    interest_rate NUMERIC(6, 2) NOT NULL DEFAULT 0.00, -- Annual percentage
    penalty_rate_or_fixed NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    penalty_type VARCHAR(50) NOT NULL DEFAULT 'none' CHECK (penalty_type IN ('none', 'percentage', 'fixed_fee', 'per_day')),
    grace_period_days INTEGER NOT NULL DEFAULT 0,
    default_conditions TEXT,
    exchange_rate_rule TEXT,
    exchange_rate NUMERIC(10, 4) NOT NULL DEFAULT 1.0000,
    target_currency VARCHAR(10),
    extracted_raw_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agreements_case_id ON agreements(case_id);

-- 3. Payment Plans (Schedule Items) Table
CREATE TABLE IF NOT EXISTS payment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    instalment_number INTEGER NOT NULL,
    due_date DATE NOT NULL,
    amount_due NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    amount_paid NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'paid', 'partially_paid', 'overdue', 'defaulted')),
    paid_date DATE,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_payment_plans_case_id ON payment_plans(case_id);
CREATE INDEX IF NOT EXISTS idx_payment_plans_due_date ON payment_plans(due_date);
CREATE INDEX IF NOT EXISTS idx_payment_plans_status ON payment_plans(status);

-- 4. Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    payment_plan_id UUID REFERENCES payment_plans(id) ON DELETE SET NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    payment_reference VARCHAR(100) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_case_id ON payments(case_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

-- 5. Calculation Records (Audit Trail) Table
CREATE TABLE IF NOT EXISTS calculation_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    calculation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    original_amount NUMERIC(15, 2) NOT NULL,
    total_paid NUMERIC(15, 2) NOT NULL,
    outstanding_principal NUMERIC(15, 2) NOT NULL,
    accrued_interest NUMERIC(15, 2) NOT NULL,
    default_interest_or_penalty NUMERIC(15, 2) NOT NULL,
    exchange_rate NUMERIC(10, 4) NOT NULL DEFAULT 1.0000,
    currency VARCHAR(10) NOT NULL,
    target_currency VARCHAR(10),
    total_amount_owed NUMERIC(15, 2) NOT NULL,
    breakdown_json JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_calculation_records_case_id ON calculation_records(case_id);
