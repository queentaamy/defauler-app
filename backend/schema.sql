-- Accrue / Court Order & Payment Agreement Defaulter App Database Schema (PostgreSQL / Supabase)

-- 1. Cases / Accounts Table
CREATE TABLE IF NOT EXISTS cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_number VARCHAR(100) NOT NULL,
    court_name VARCHAR(200),
    account_type VARCHAR(50) NOT NULL DEFAULT 'settlement' CHECK (account_type IN ('settlement', 'judgment_debt')),
    plaintiff_name VARCHAR(200) NOT NULL DEFAULT 'Universal Merchant Bank',
    plaintiff_address TEXT DEFAULT '[PLAINTIFF ADDRESS]',
    plaintiff_contact VARCHAR(100) DEFAULT '[PLAINTIFF CONTACT]',
    defendant_name VARCHAR(200) NOT NULL,
    defendant_address TEXT,
    defendant_contact VARCHAR(100),
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    
    -- Settlement Terms
    settlement_total NUMERIC(15, 2),
    reinstatement_amount NUMERIC(15, 2),
    reinstatement_interest_rate NUMERIC(6, 2) DEFAULT 0.00,
    interest_accrual_start_date DATE,
    is_breached BOOLEAN NOT NULL DEFAULT FALSE,
    breached_date DATE,
    breached_reason TEXT,
    
    -- Judgment Debt Terms
    judgment_date DATE,
    cost_awarded NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    interest_method VARCHAR(50) NOT NULL DEFAULT 'simple_30_360',

    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'overdue', 'defaulted', 'breached', 'settled', 'archived')),
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cases_case_number ON cases(case_number);
CREATE INDEX IF NOT EXISTS idx_cases_defendant ON cases(defendant_name);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_account_type ON cases(account_type);

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
    interest_rate NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
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

-- 4. Payment Checkpoints Table (Cumulative targets for Settlement Accounts)
CREATE TABLE IF NOT EXISTS payment_checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    checkpoint_number INTEGER NOT NULL,
    due_date DATE NOT NULL,
    cumulative_required NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    amount_required NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    actually_paid_by_then NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'not_due' CHECK (status IN ('met', 'missed', 'on_track', 'not_due')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checkpoints_case_id ON payment_checkpoints(case_id);

-- 5. Interest Rate Tranches Table (For Variable Rate Court Orders)
CREATE TABLE IF NOT EXISTS interest_rate_tranches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    effective_from DATE NOT NULL,
    base_rate NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    spread NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    penal_rate NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    all_in_rate NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tranches_case_id ON interest_rate_tranches(case_id);

-- 6. Currency Gain/Loss Items Table
CREATE TABLE IF NOT EXISTS currency_gain_loss_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    payment_id UUID,
    obligation_due_date DATE NOT NULL,
    amount_contract_curr NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    payment_date DATE NOT NULL,
    due_date_rate NUMERIC(12, 4) NOT NULL DEFAULT 1.0000,
    actual_payment_rate NUMERIC(12, 4) NOT NULL DEFAULT 1.0000,
    local_currency_impact NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    local_currency VARCHAR(10) NOT NULL DEFAULT 'GHS',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fx_case_id ON currency_gain_loss_items(case_id);

-- 7. Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    payment_plan_id UUID REFERENCES payment_plans(id) ON DELETE SET NULL,
    checkpoint_id UUID REFERENCES payment_checkpoints(id) ON DELETE SET NULL,
    amount NUMERIC(15, 2) NOT NULL,
    payment_date DATE NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    payment_reference VARCHAR(100) NOT NULL,
    local_amount_paid NUMERIC(15, 2),
    local_currency VARCHAR(10),
    exchange_rate_applied NUMERIC(12, 4),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_case_id ON payments(case_id);

-- 8. Calculation Records Table
CREATE TABLE IF NOT EXISTS calculation_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    calculation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    as_of_date DATE,
    original_amount NUMERIC(15, 2) NOT NULL,
    total_paid NUMERIC(15, 2) NOT NULL,
    outstanding_principal NUMERIC(15, 2) NOT NULL,
    accrued_interest NUMERIC(15, 2) NOT NULL,
    default_interest_or_penalty NUMERIC(15, 2) NOT NULL,
    exchange_rate NUMERIC(10, 4) NOT NULL DEFAULT 1.0000,
    currency VARCHAR(10) NOT NULL,
    target_currency VARCHAR(10),
    total_amount_owed NUMERIC(15, 2) NOT NULL,
    breakdown_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_calc_case_id ON calculation_records(case_id);
