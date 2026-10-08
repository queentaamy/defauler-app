const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

export async function uploadDocument(file: File): Promise<ExtractedAgreementData> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE_URL}/api/documents/upload`, {
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
  const res = await fetch(`${API_BASE_URL}/api/cases`, {
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
  const res = await fetch(`${API_BASE_URL}/api/cases`);
  if (!res.ok) throw new Error("Failed to fetch cases");
  return res.json();
}

export async function getCase(id: string): Promise<CaseDetail> {
  const res = await fetch(`${API_BASE_URL}/api/cases/${id}`);
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
  const res = await fetch(`${API_BASE_URL}/api/payments/${caseId}`, {
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
  const res = await fetch(`${API_BASE_URL}/api/calculations/${caseId}/recalculate`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to recalculate case");
  return res.json();
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const res = await fetch(`${API_BASE_URL}/api/dashboard/stats`);
  if (!res.ok) throw new Error("Failed to fetch dashboard metrics");
  return res.json();
}
