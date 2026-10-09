/**
 * Resolves the backend base URL dynamically:
 * - On the server (Next.js server-side, Server Components, Route Handlers):
 *   Uses `process.env.BACKEND_URL` injected by Vercel via internal service binding.
 * - On the client (in the browser):
 *   Uses relative URL (empty string `""`) so calls hit `/api/...` directly,
 *   which Vercel's top-level rewrite routes to the `backend` service.
 * - Local standalone development:
 *   Falls back to `process.env.NEXT_PUBLIC_API_URL` or `http://localhost:8000`.
 */
export function getApiBaseUrl(): string {
  // 1. Server-side in Node / Vercel Serverless Function: read Vercel service binding
  if (typeof window === "undefined") {
    if (process.env.BACKEND_URL) {
      return process.env.BACKEND_URL.replace(/\/$/, "");
    }
  }

  // 2. Explicit public override (if configured)
  if (process.env.NEXT_PUBLIC_API_URL !== undefined && process.env.NEXT_PUBLIC_API_URL !== "") {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  }

  // 3. Client-side in browser: relative URL routes through Vercel's public rewrites
  if (typeof window !== "undefined") {
    return "";
  }

  // 4. Local standalone fallback
  return "http://localhost:8000";
}

export interface ExtractedAgreementData {
  case_number: string;
  court_name: string;
  defendant_name: string;
  defendant_address: string;
  defendant_contact: string;
  original_amount: number;
  currency: string;
  payment_amount: number;
  frequency: string;
  start_date: string;
  instalments_count: number;
  interest_rate: number;
  penalty_rate_or_fixed: number;
  penalty_type: string;
  grace_period_days: number;
  default_conditions: string;
  exchange_rate_rule?: string;
  exchange_rate: number;
  target_currency?: string;
  document_name?: string;
  document_type?: string;
  file_path?: string;
  raw_text_preview?: string;
}

export interface PaymentPlanItem {
  id: string;
  case_id: string;
  instalment_number: number;
  due_date: string;
  amount_due: number;
  amount_paid: number;
  status: "upcoming" | "paid" | "partially_paid" | "overdue" | "defaulted";
  paid_date?: string;
  notes?: string;
}

export interface PaymentRecord {
  id: string;
  case_id: string;
  payment_plan_id?: string;
  amount: number;
  payment_date: string;
  currency: string;
  payment_reference: string;
  notes?: string;
  created_at: string;
}

export interface CalculationBreakdown {
  original_amount: number;
  total_paid: number;
  outstanding_principal: number;
  accrued_interest: number;
  default_interest_or_penalty: number;
  exchange_rate: number;
  currency: string;
  target_currency?: string;
  total_amount_owed: number;
  step_by_step_log: string[];
  calculation_date: string;
}

export interface PeriodDefaultImpact {
  instalment_number: number;
  due_date: string;
  amount_due: number;
  amount_paid: number;
  shortfall: number;
  days_overdue: number;
  is_defaulted: boolean;
  status: "upcoming" | "paid" | "partially_paid" | "overdue" | "defaulted";
  period_interest: number;
  period_penalty: number;
  period_creditor_gain: number;
  period_total_owed: number;
}

export interface GainsAndLossesBreakdown {
  currency: string;
  total_agreed: number;
  total_expected_to_date: number;
  total_paid_to_date: number;
  cash_flow_shortfall: number;
  unpaid_principal: number;
  total_accrued_interest: number;
  total_default_penalties: number;
  total_creditor_gains: number;
  total_debtor_penalty_loss: number;
  total_current_owed: number;
  defaulted_periods_count: number;
  overdue_periods_count: number;
  settled_periods_count: number;
  has_defaulted: boolean;
  default_clause_status: string;
  evaluation_date: string;
  periods: PeriodDefaultImpact[];
}

export interface PaymentCheckpoint {
  id: string;
  case_id: string;
  checkpoint_number: number;
  due_date: string;
  cumulative_required: number;
  amount_required: number;
  actually_paid_by_then: number;
  status: "met" | "missed" | "on_track" | "not_due";
  notes?: string;
}

export interface SettlementEvaluation {
  is_breached: boolean;
  status: "SETTLEMENT BREACHED" | "ON TRACK" | "FULLY SETTLED";
  status_message: string;
  settlement_total: number;
  reinstatement_amount: number;
  reinstatement_interest_rate: number;
  interest_accrual_start_date?: string;
  as_of_date: string;
  total_paid: number;
  reinstated_amount_due?: number;
  remaining_under_settlement?: number;
  next_checkpoint_target?: number;
  next_checkpoint_date?: string;
  checkpoints: PaymentCheckpoint[];
}

export interface InterestRateTranche {
  id: string;
  case_id: string;
  effective_from: string;
  base_rate: number;
  spread: number;
  penal_rate: number;
  all_in_rate: number;
  notes?: string;
}

export interface MonthlyLedgerRow {
  index: number;
  period: string;
  days: number;
  all_in_rate: number;
  balance: number;
  payment?: number;
  interest_due: number;
  cumulative_interest: number;
}

export interface MonthlyLedgerResponse {
  currency: string;
  judgment_debt: number;
  judgment_date: string;
  cost_awarded: number;
  interest_method: string;
  as_of_date: string;
  current_balance: number;
  total_cumulative_interest: number;
  total_paid: number;
  total_amount_owed: number;
  rows: MonthlyLedgerRow[];
}

export interface CurrencyGainLossItem {
  id: string;
  case_id: string;
  obligation_due_date: string;
  amount_contract_curr: number;
  payment_date: string;
  due_date_rate: number;
  actual_payment_rate: number;
  local_currency_impact: number;
  local_currency: string;
  notes?: string;
}

export interface CurrencyGainLossResponse {
  total_currency_impact: number;
  local_currency: string;
  contract_currency: string;
  items: CurrencyGainLossItem[];
}

export interface AgreementUpdatePayload {
  defendant_name?: string;
  defendant_address?: string;
  defendant_contact?: string;
  case_number?: string;
  court_name?: string;
  original_amount?: number;
  currency?: string;
  payment_amount?: number;
  frequency?: string;
  start_date?: string;
  instalments_count?: number;
  interest_rate?: number;
  penalty_rate_or_fixed?: number;
  penalty_type?: string;
  grace_period_days?: number;
  default_conditions?: string;
  exchange_rate?: number;
  target_currency?: string;
  regenerate_schedule?: boolean;
  
  // Accrue extensions
  settlement_total?: number;
  reinstatement_amount?: number;
  reinstatement_interest_rate?: number;
  interest_accrual_start_date?: string;
  judgment_date?: string;
  cost_awarded?: number;
  interest_method?: string;
}

export interface CaseDetail {
  id: string;
  case_number: string;
  court_name?: string;
  account_type: "settlement" | "judgment_debt";
  plaintiff_name: string;
  plaintiff_address?: string;
  plaintiff_contact?: string;
  defendant_name: string;
  defendant_address?: string;
  defendant_contact?: string;
  currency: string;
  status: "active" | "overdue" | "defaulted" | "settled";
  is_archived: boolean;
  created_at: string;
  
  // Settlement Terms
  settlement_total?: number;
  reinstatement_amount?: number;
  reinstatement_interest_rate?: number;
  interest_accrual_start_date?: string;
  is_breached: boolean;
  breached_date?: string;
  breached_reason?: string;

  // Judgment Debt Terms
  judgment_date?: string;
  cost_awarded: number;
  interest_method: string;

  agreement?: {
    id: string;
    document_name?: string;
    document_type?: string;
    original_amount: number;
    currency: string;
    payment_amount: number;
    frequency: string;
    start_date: string;
    instalments_count: number;
    interest_rate: number;
    penalty_rate_or_fixed: number;
    penalty_type: string;
    grace_period_days: number;
    default_conditions?: string;
    exchange_rate_rule?: string;
    exchange_rate: number;
    target_currency?: string;
  };
  payment_plans: PaymentPlanItem[];
  checkpoints: PaymentCheckpoint[];
  interest_tranches: InterestRateTranche[];
  currency_gain_losses: CurrencyGainLossItem[];
  payments: PaymentRecord[];
  latest_calculation?: CalculationBreakdown;
  gains_and_losses?: GainsAndLossesBreakdown;
  settlement_evaluation?: SettlementEvaluation;
  monthly_ledger?: MonthlyLedgerResponse;
}

export interface DashboardStats {
  total_cases: number;
  active_plans: number;
  overdue_payments: number;
  defaulted_cases: number;
  total_outstanding_amount: number;
  currency: string;
  recent_cases: {
    id: string;
    case_number: string;
    defendant_name: string;
    account_type?: string;
    status: string;
    original_amount: number;
    currency: string;
    current_owed: number;
    created_at: string;
  }[];
}

export interface SettlementAccountCreateRequest {
  defendant_name: string;
  currency: string;
  settlement_total: number;
  reinstatement_amount: number;
  reinstatement_interest_rate: number;
  interest_accrual_start_date: string;
  case_number?: string;
  defendant_address?: string;
  defendant_contact?: string;
  court_name?: string;
  checkpoints?: {
    checkpoint_number?: number;
    due_date: string;
    cumulative_required: number;
    amount_required?: number;
    notes?: string;
  }[];
}

export interface JudgmentDebtCreateRequest {
  defendant_name: string;
  case_number?: string;
  court_name?: string;
  currency: string;
  judgment_debt: number;
  judgment_date: string;
  cost_awarded?: number;
  interest_method?: string;
  initial_tranche?: {
    effective_from: string;
    base_rate: number;
    spread?: number;
    penal_rate?: number;
    notes?: string;
  };
  defendant_address?: string;
  defendant_contact?: string;
}

async function safeFetch(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (err: any) {
    if (err?.name === "TypeError" || err?.message?.toLowerCase().includes("fetch")) {
      throw new Error(
        "Unable to connect to the backend server (Failed to fetch). Please ensure the FastAPI backend is running on http://localhost:8000."
      );
    }
    throw err;
  }
}

export async function uploadDocument(file: File): Promise<ExtractedAgreementData> {
  const formData = new FormData();
  formData.append("file", file);

  const baseUrl = getApiBaseUrl();
  const res = await safeFetch(`${baseUrl}/api/documents/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to upload and extract document");
  }

  return res.json();
}

export async function createCase(data: ExtractedAgreementData): Promise<CaseDetail> {
  const baseUrl = getApiBaseUrl();
  const res = await safeFetch(`${baseUrl}/api/cases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to create case");
  }

  return res.json();
}

export async function createSettlementAccount(payload: SettlementAccountCreateRequest): Promise<CaseDetail> {
  const baseUrl = getApiBaseUrl();
  const res = await safeFetch(`${baseUrl}/api/cases/settlement`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to create settlement account");
  }

  return res.json();
}

export async function createJudgmentDebtAccount(payload: JudgmentDebtCreateRequest): Promise<CaseDetail> {
  const baseUrl = getApiBaseUrl();
  const res = await safeFetch(`${baseUrl}/api/cases/judgment-debt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to create judgment debt account");
  }

  return res.json();
}

export async function getCases(type?: string, includeArchived: boolean = false): Promise<CaseDetail[]> {
  const baseUrl = getApiBaseUrl();
  const params = new URLSearchParams();
  if (type) params.append("type", type);
  if (includeArchived) params.append("include_archived", "true");
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await safeFetch(`${baseUrl}/api/cases${qs}`);
  if (!res.ok) throw new Error("Failed to fetch cases");
  return res.json();
}

export async function getCase(id: string, asOfDate?: string): Promise<CaseDetail> {
  const baseUrl = getApiBaseUrl();
  const url = asOfDate 
    ? `${baseUrl}/api/cases/${id}?as_of_date=${encodeURIComponent(asOfDate)}`
    : `${baseUrl}/api/cases/${id}`;
  const res = await safeFetch(url);
  if (!res.ok) throw new Error("Failed to fetch case details");
  return res.json();
}

export async function getMonthlyLedger(caseId: string, asOfDate?: string): Promise<MonthlyLedgerResponse> {
  const baseUrl = getApiBaseUrl();
  const url = asOfDate 
    ? `${baseUrl}/api/cases/${caseId}/ledger?as_of_date=${encodeURIComponent(asOfDate)}`
    : `${baseUrl}/api/cases/${caseId}/ledger`;
  const res = await safeFetch(url);
  if (!res.ok) throw new Error("Failed to fetch monthly ledger");
  return res.json();
}

export async function getCheckpoints(caseId: string, asOfDate?: string): Promise<SettlementEvaluation> {
  const baseUrl = getApiBaseUrl();
  const url = asOfDate 
    ? `${baseUrl}/api/cases/${caseId}/checkpoints?as_of_date=${encodeURIComponent(asOfDate)}`
    : `${baseUrl}/api/cases/${caseId}/checkpoints`;
  const res = await safeFetch(url);
  if (!res.ok) throw new Error("Failed to evaluate settlement checkpoints");
  return res.json();
}

export async function addCheckpoint(
  caseId: string, 
  payload: { checkpoint_number?: number; due_date: string; cumulative_required: number; amount_required?: number; notes?: string }
): Promise<CaseDetail> {
  const baseUrl = getApiBaseUrl();
  const res = await safeFetch(`${baseUrl}/api/cases/${caseId}/checkpoints`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to add checkpoint");
  }
  return res.json();
}

export async function addInterestTranche(
  caseId: string,
  payload: { effective_from: string; base_rate: number; spread?: number; penal_rate?: number; notes?: string }
): Promise<CaseDetail> {
  const baseUrl = getApiBaseUrl();
  const res = await safeFetch(`${baseUrl}/api/cases/${caseId}/tranches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to add interest rate tranche");
  }
  return res.json();
}

export async function getFxImpact(caseId: string): Promise<CurrencyGainLossResponse> {
  const baseUrl = getApiBaseUrl();
  const res = await safeFetch(`${baseUrl}/api/cases/${caseId}/fx-impact`);
  if (!res.ok) throw new Error("Failed to fetch FX impact records");
  return res.json();
}

export async function addFxImpactItem(
  caseId: string,
  payload: {
    obligation_due_date: string;
    amount_contract_curr: number;
    payment_date: string;
    due_date_rate: number;
    actual_payment_rate: number;
    local_currency?: string;
    notes?: string;
  }
): Promise<CaseDetail> {
  const baseUrl = getApiBaseUrl();
  const res = await safeFetch(`${baseUrl}/api/cases/${caseId}/fx-impact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to record FX impact item");
  }
  return res.json();
}

export async function recordPayment(
  caseId: string,
  payment: {
    amount: number;
    payment_date: string;
    currency: string;
    payment_reference: string;
    notes?: string;
  }
): Promise<CaseDetail> {
  const baseUrl = getApiBaseUrl();
  const res = await safeFetch(`${baseUrl}/api/payments/${caseId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payment),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to record payment");
  }

  return res.json();
}

export async function recalculateCase(caseId: string): Promise<CalculationBreakdown> {
  const baseUrl = getApiBaseUrl();
  const res = await safeFetch(`${baseUrl}/api/calculations/${caseId}/recalculate`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to recalculate case");
  return res.json();
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const baseUrl = getApiBaseUrl();
  const res = await safeFetch(`${baseUrl}/api/dashboard/stats`);
  if (!res.ok) throw new Error("Failed to fetch dashboard metrics");
  return res.json();
}

export async function updateCase(caseId: string, payload: AgreementUpdatePayload): Promise<CaseDetail> {
  const baseUrl = getApiBaseUrl();
  const res = await safeFetch(`${baseUrl}/api/cases/${caseId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to update agreement terms");
  }

  return res.json();
}

export async function deleteCase(caseId: string): Promise<{ status: string; message: string }> {
  const baseUrl = getApiBaseUrl();
  const res = await safeFetch(`${baseUrl}/api/cases/${caseId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to delete account");
  }
  return res.json();
}

export async function archiveCase(caseId: string): Promise<{ status: string; is_archived: boolean }> {
  const baseUrl = getApiBaseUrl();
  const res = await safeFetch(`${baseUrl}/api/cases/${caseId}/archive`, {
    method: "POST",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to archive account");
  }
  return res.json();
}

export async function downloadFullBackup(): Promise<any> {
  const baseUrl = getApiBaseUrl();
  const res = await safeFetch(`${baseUrl}/api/cases/export/backup`);
  if (!res.ok) throw new Error("Failed to download full backup");
  const data = await res.json();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `accrue-backup-${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return data;
}

export async function updateScheduleItem(
  caseId: string,
  itemId: string,
  payload: { due_date?: string; amount_due?: number; notes?: string }
): Promise<CaseDetail> {
  const baseUrl = getApiBaseUrl();
  const res = await safeFetch(`${baseUrl}/api/cases/${caseId}/schedule/${itemId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to update instalment");
  }

  return res.json();
}

export async function getGainsAndLosses(caseId: string): Promise<GainsAndLossesBreakdown> {
  const baseUrl = getApiBaseUrl();
  const res = await safeFetch(`${baseUrl}/api/cases/${caseId}/gains-and-losses`);

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to fetch gains and losses analysis");
  }

  return res.json();
}

export async function searchCases(query: string): Promise<CaseDetail[]> {
  const baseUrl = getApiBaseUrl();
  const res = await safeFetch(`${baseUrl}/api/cases/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("Failed to search accounts");
  return res.json();
}
