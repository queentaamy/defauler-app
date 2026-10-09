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
}

export interface CaseDetail {
  id: string;
  case_number: string;
  court_name?: string;
  plaintiff_name: string;
  plaintiff_address?: string;
  plaintiff_contact?: string;
  defendant_name: string;
  defendant_address?: string;
  defendant_contact?: string;
  status: "active" | "overdue" | "defaulted" | "settled";
  created_at: string;
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
  payments: PaymentRecord[];
  latest_calculation?: CalculationBreakdown;
  gains_and_losses?: GainsAndLossesBreakdown;
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
    status: string;
    original_amount: number;
    currency: string;
    current_owed: number;
    created_at: string;
  }[];
}

async function safeFetch(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (err: any) {
    if (err?.name === "TypeError" || err?.message?.toLowerCase().includes("fetch")) {
      throw new Error(
        "Unable to connect to the backend server (Failed to fetch). Please ensure the FastAPI backend is running on http://localhost:8000 (run .\\start-backend.ps1)."
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

export async function getCases(): Promise<CaseDetail[]> {
  const baseUrl = getApiBaseUrl();
  const res = await safeFetch(`${baseUrl}/api/cases`);
  if (!res.ok) throw new Error("Failed to fetch cases");
  return res.json();
}

export async function getCase(id: string): Promise<CaseDetail> {
  const baseUrl = getApiBaseUrl();
  const res = await safeFetch(`${baseUrl}/api/cases/${id}`);
  if (!res.ok) throw new Error("Failed to fetch case details");
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
