"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { 
  Scale, 
  ShieldCheck, 
  User, 
  Calendar, 
  DollarSign, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowLeft, 
  PlusCircle, 
  RefreshCw, 
  FileText, 
  Printer, 
  Info,
  Building,
  CreditCard,
  Percent,
  Pencil,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  Edit2
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  getCase, 
  recordPayment, 
  recalculateCase, 
  updateCase, 
  updateScheduleItem, 
  CaseDetail, 
  AgreementUpdatePayload, 
  PaymentPlanItem 
} from "@/lib/api";

export default function CaseDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const caseId = unwrappedParams.id;

  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"schedule" | "gains_losses" | "payments" | "breakdown" | "agreement">("schedule");

  // Payment Modal State
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [paymentRef, setPaymentRef] = useState<string>("");
  const [paymentNotes, setPaymentNotes] = useState<string>("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Edit Terms Modal State
  const [isEditTermsOpen, setIsEditTermsOpen] = useState(false);
  const [isSavingTerms, setIsSavingTerms] = useState(false);
  const [editFormData, setEditFormData] = useState<AgreementUpdatePayload>({});

  // Edit Individual Instalment Modal State
  const [editingInstalment, setEditingInstalment] = useState<PaymentPlanItem | null>(null);
  const [editInstalmentDate, setEditInstalmentDate] = useState<string>("");
  const [editInstalmentAmount, setEditInstalmentAmount] = useState<string>("");
  const [editInstalmentNotes, setEditInstalmentNotes] = useState<string>("");
  const [isSavingInstalment, setIsSavingInstalment] = useState(false);

  const loadCase = async () => {
    try {
      setLoading(true);
      const data = await getCase(caseId);
      setCaseData(data);
      if (data.agreement && !paymentAmount) {
        setPaymentAmount(data.agreement.payment_amount.toString());
      }
    } catch (err: any) {
      setError(err.message || "Failed to load case");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCase();
  }, [caseId]);

  const handleOpenEditTerms = () => {
    if (!caseData || !caseData.agreement) return;
    const agr = caseData.agreement;
    setEditFormData({
      defendant_name: caseData.defendant_name,
      defendant_address: caseData.defendant_address || "",
      defendant_contact: caseData.defendant_contact || "",
      case_number: caseData.case_number,
      court_name: caseData.court_name || "",
      original_amount: agr.original_amount,
      currency: agr.currency,
      payment_amount: agr.payment_amount,
      frequency: agr.frequency,
      start_date: agr.start_date,
      instalments_count: agr.instalments_count,
      interest_rate: agr.interest_rate,
      penalty_rate_or_fixed: agr.penalty_rate_or_fixed,
      penalty_type: agr.penalty_type,
      grace_period_days: agr.grace_period_days,
      default_conditions: agr.default_conditions || "",
      regenerate_schedule: false,
    });
    setIsEditTermsOpen(true);
  };

  const handleSaveTermsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseData) return;
    setIsSavingTerms(true);
    try {
      const updated = await updateCase(caseId, editFormData);
      setCaseData(updated);
      setIsEditTermsOpen(false);
    } catch (err: any) {
      alert(err.message || "Failed to update agreement terms");
    } finally {
      setIsSavingTerms(false);
    }
  };

  const handleOpenEditInstalment = (item: PaymentPlanItem) => {
    setEditingInstalment(item);
    setEditInstalmentDate(item.due_date);
    setEditInstalmentAmount(item.amount_due.toString());
    setEditInstalmentNotes(item.notes || "");
  };

  const handleSaveInstalmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInstalment || !caseData) return;
    setIsSavingInstalment(true);
    try {
      const updated = await updateScheduleItem(caseId, editingInstalment.id, {
        due_date: editInstalmentDate,
        amount_due: parseFloat(editInstalmentAmount),
        notes: editInstalmentNotes || undefined,
      });
      setCaseData(updated);
      setEditingInstalment(null);
    } catch (err: any) {
      alert(err.message || "Failed to update instalment");
    } finally {
      setIsSavingInstalment(false);
    }
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseData) return;

    setIsSubmittingPayment(true);
    try {
      const updated = await recordPayment(caseId, {
        amount: parseFloat(paymentAmount),
        payment_date: paymentDate,
        currency: caseData.agreement?.currency || "USD",
        payment_reference: paymentRef,
        notes: paymentNotes || undefined,
      });
      setCaseData(updated);
      setIsPaymentOpen(false);
      setPaymentRef("");
      setPaymentNotes("");
    } catch (err: any) {
      alert(err.message || "Failed to record payment");
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      await recalculateCase(caseId);
      await loadCase();
    } catch (err: any) {
      alert(err.message || "Failed to recalculate balance");
    } finally {
      setIsRecalculating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "defaulted":
        return <Badge variant="destructive" className="capitalize font-bold">Defaulted</Badge>;
      case "overdue":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 capitalize font-bold">Overdue</Badge>;
      case "settled":
        return <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 capitalize font-bold">Settled</Badge>;
      case "partially_paid":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 capitalize font-bold">Partially Paid</Badge>;
      case "paid":
        return <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-emerald-200 capitalize font-bold">Paid</Badge>;
      default:
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 capitalize font-medium">Upcoming</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="text-base font-semibold">Loading Defendant Account...</div>
        <div className="text-xs text-muted-foreground">Evaluating schedule, default status, and gains/losses...</div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="py-24 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-destructive mx-auto" />
        <div className="text-base font-bold text-destructive">{error || "Account not found"}</div>
        <Link href="/cases" className={buttonVariants({ variant: "outline" })}>
          Back to Accounts Directory
        </Link>
      </div>
    );
  }

  const calc = caseData.latest_calculation;
  const agr = caseData.agreement;
  const gnl = caseData.gains_and_losses;

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-muted-foreground mb-1">
            <Link href="/cases" className="hover:underline flex items-center gap-1 font-medium">
              <ArrowLeft className="w-3 h-3" />
              <span>Accounts Directory</span>
            </Link>
            <span>/</span>
            <span className="font-mono text-foreground font-semibold">{caseData.case_number}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight font-heading text-foreground">
              Defendant: {caseData.defendant_name}
            </h1>
            {getStatusBadge(caseData.status)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Account Ref: <span className="font-mono font-semibold text-foreground">{caseData.case_number}</span>
            {caseData.court_name ? ` • ${caseData.court_name}` : " • Terms of Settlement Agreement"}
            {caseData.defendant_contact ? ` • Tel: ${caseData.defendant_contact}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Modify Terms Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenEditTerms}
            className="gap-1.5 text-xs font-semibold"
          >
            <Pencil className="w-3.5 h-3.5 text-primary" />
            <span>Modify Terms</span>
          </Button>

          {/* Recalculate Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRecalculate}
            disabled={isRecalculating}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRecalculating ? "animate-spin" : ""}`} />
            <span>Recalculate</span>
          </Button>

          {/* Audit Report Button */}
          <Link href={`/cases/${caseData.id}/report`} className={buttonVariants({ variant: "outline", size: "sm", className: "gap-1.5 text-xs" })}>
            <Printer className="w-3.5 h-3.5" />
            <span>Report</span>
          </Link>

          {/* Record Payment Button */}
          <Button 
            size="sm" 
            onClick={() => setIsPaymentOpen(true)}
            className="gap-1.5 text-xs font-bold shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Record Payment</span>
          </Button>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Amount Owed */}
        <Card className="shadow-xs border-primary/30 bg-primary/5">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold uppercase text-primary">
              Total Enforceable Debt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">
              {agr?.currency} {(calc?.total_amount_owed ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Principal + Default Penalties + Interest
            </p>
          </CardContent>
        </Card>

        {/* Outstanding Principal */}
        <Card className="shadow-xs">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              Outstanding Principal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {agr?.currency} {(calc?.outstanding_principal ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Total agreed: {agr?.currency} {(agr?.original_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        {/* Total Paid */}
        <Card className="shadow-xs">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              Total Recovered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {agr?.currency} {(calc?.total_paid ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Across {caseData.payments.length} payment(s)
            </p>
          </CardContent>
        </Card>

        {/* Cash Shortfall */}
        <Card className={`shadow-xs ${gnl && gnl.cash_flow_shortfall > 0 ? "border-amber-500/30 bg-amber-500/5" : ""}`}>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold uppercase text-amber-600 dark:text-amber-400">
              Cash Flow Loss (Shortfall)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {agr?.currency} {(gnl?.cash_flow_shortfall ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Expected to date: {agr?.currency} {(gnl?.total_expected_to_date ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        {/* Accrued Penalties & Gains */}
        <Card className="shadow-xs">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold uppercase text-destructive">
              Default Penalties & Interest
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {agr?.currency} {(gnl?.total_creditor_gains ?? ((calc?.accrued_interest ?? 0) + (calc?.default_interest_or_penalty ?? 0))).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Penalties: ${calc?.default_interest_or_penalty.toFixed(2)} • Interest: ${calc?.accrued_interest.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Navigation */}
      <div className="space-y-4">
        <div className="flex flex-wrap border-b gap-x-6 gap-y-2 text-sm font-medium">
          <button
            onClick={() => setActiveTab("schedule")}
            className={`pb-2.5 transition-colors border-b-2 font-semibold flex items-center gap-1.5 ${
              activeTab === "schedule"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Payment Schedule ({caseData.payment_plans.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("gains_losses")}
            className={`pb-2.5 transition-colors border-b-2 font-semibold flex items-center gap-1.5 ${
              activeTab === "gains_losses"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <TrendingDown className="w-4 h-4 text-amber-500" />
            <span>Gains & Losses / Default Impact</span>
            {gnl && gnl.has_defaulted && (
              <Badge variant="destructive" className="text-[10px] py-0 px-1.5 h-4 ml-1">
                Default
              </Badge>
            )}
          </button>

          <button
            onClick={() => setActiveTab("payments")}
            className={`pb-2.5 transition-colors border-b-2 font-semibold flex items-center gap-1.5 ${
              activeTab === "payments"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Payment History ({caseData.payments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("breakdown")}
            className={`pb-2.5 transition-colors border-b-2 font-semibold flex items-center gap-1.5 ${
              activeTab === "breakdown"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Calculation Audit</span>
          </button>

          <button
            onClick={() => setActiveTab("agreement")}
            className={`pb-2.5 transition-colors border-b-2 font-semibold flex items-center gap-1.5 ${
              activeTab === "agreement"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Agreement Terms</span>
          </button>
        </div>

        {/* TAB 1: Payment Schedule */}
        {activeTab === "schedule" && (
          <Card className="shadow-xs">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Enforceable Payment Schedule</CardTitle>
                <CardDescription className="text-xs">
                  Instalments are evaluated sequentially. You can click "Edit" on any instalment to customize dates or amounts.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleOpenEditTerms} className="gap-1.5 text-xs">
                <Pencil className="w-3.5 h-3.5" />
                <span>Adjust All Terms</span>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">#</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Amount Due</TableHead>
                      <TableHead className="text-right">Amount Paid</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Paid Date</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="w-16 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {caseData.payment_plans.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-semibold text-xs">#{item.instalment_number}</TableCell>
                        <TableCell className="text-xs font-mono">{item.due_date}</TableCell>
                        <TableCell className="text-right font-mono text-xs font-medium">
                          {agr?.currency} {item.amount_due.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {agr?.currency} {item.amount_paid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {item.paid_date || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                          {item.notes || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditInstalment(item)}
                            className="h-7 px-2 text-xs"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span className="sr-only">Edit</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* TAB 2: Gains & Losses / Default Impact */}
        {activeTab === "gains_losses" && gnl && (
          <div className="space-y-4">
            {/* Status Announcement Banner */}
            <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${
              gnl.has_defaulted
                ? "bg-destructive/10 border-destructive/30 text-destructive"
                : gnl.overdue_periods_count > 0
                ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
            }`}>
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold text-sm">Default Engine Status</h4>
                <p className="text-xs leading-relaxed font-medium">{gnl.default_clause_status}</p>
              </div>
            </div>

            {/* Financial Gains vs Losses Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Creditor Financial Impact */}
              <Card className="shadow-xs">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-amber-500" />
                      <span>Creditor Impact (Cash Flow Loss vs Penalties)</span>
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px]">Creditor View</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">Expected Inflow to Date:</span>
                    <span className="font-mono font-semibold">{gnl.currency} {gnl.total_expected_to_date.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">Actual Cash Received to Date:</span>
                    <span className="font-mono font-bold text-emerald-600">-{gnl.currency} {gnl.total_paid_to_date.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="font-semibold text-amber-600">Unrecovered Cash Flow (Loss for period):</span>
                    <span className="font-mono font-bold text-amber-600">{gnl.currency} {gnl.cash_flow_shortfall.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">Additional Gains from Default Penalty:</span>
                    <span className="font-mono font-bold text-primary">+{gnl.currency} {gnl.total_default_penalties.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Compensatory Interest Accrued:</span>
                    <span className="font-mono font-bold text-primary">+{gnl.currency} {gnl.total_accrued_interest.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Debtor / Defendant Penalty Loss */}
              <Card className="shadow-xs">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-destructive" />
                      <span>Defendant Additional Cost (Avoidable Default Losses)</span>
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px]">Debtor Liability</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">Original Agreed Principal:</span>
                    <span className="font-mono font-semibold">{gnl.currency} {gnl.total_agreed.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">Remaining Principal Owed:</span>
                    <span className="font-mono font-semibold">{gnl.currency} {gnl.unpaid_principal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="font-semibold text-destructive">Extra Cost Incurred from Non-Payment:</span>
                    <span className="font-mono font-bold text-destructive">+{gnl.currency} {gnl.total_debtor_penalty_loss.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">Defaulted Periods Count:</span>
                    <span className="font-semibold">{gnl.defaulted_periods_count} of {gnl.periods.length} instalments</span>
                  </div>
                  <div className="flex justify-between py-1 font-bold">
                    <span>Total Claim Enforceable Today:</span>
                    <span className="font-mono text-base text-foreground">{gnl.currency} {gnl.total_current_owed.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Period-by-Period Default Analysis Table */}
            <Card className="shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">Period-by-Period Default Breakdown</CardTitle>
                <CardDescription className="text-xs">
                  Detailed analysis of each period showing missed cash flows, days overdue, interest, and triggered penalties.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Instalment</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-right">Agreed Due</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead className="text-right">Cash Loss (Shortfall)</TableHead>
                        <TableHead>Overdue Days</TableHead>
                        <TableHead>Period Status</TableHead>
                        <TableHead className="text-right">Interest</TableHead>
                        <TableHead className="text-right">Penalty</TableHead>
                        <TableHead className="text-right">Total Owed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gnl.periods.map((p) => (
                        <TableRow key={p.instalment_number} className={p.is_defaulted ? "bg-destructive/5" : ""}>
                          <TableCell className="font-semibold text-xs">#{p.instalment_number}</TableCell>
                          <TableCell className="text-xs font-mono">{p.due_date}</TableCell>
                          <TableCell className="text-right font-mono text-xs font-medium">
                            {gnl.currency} {p.amount_due.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            {gnl.currency} {p.amount_paid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold text-amber-600">
                            {p.shortfall > 0 ? `${gnl.currency} ${p.shortfall.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "—"}
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {p.days_overdue > 0 ? `${p.days_overdue} days` : "0"}
                          </TableCell>
                          <TableCell>{getStatusBadge(p.status)}</TableCell>
                          <TableCell className="text-right font-mono text-xs text-primary">
                            {p.period_interest > 0 ? `+${p.period_interest.toFixed(2)}` : "—"}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold text-destructive">
                            {p.period_penalty > 0 ? `+${p.period_penalty.toFixed(2)}` : "—"}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-black text-foreground">
                            {gnl.currency} {p.period_total_owed.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 3: Payment History */}
        {activeTab === "payments" && (
          <Card className="shadow-xs">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Recorded Payment Records</CardTitle>
                <CardDescription className="text-xs">
                  Chronological payment transactions logged for this defendant.
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => setIsPaymentOpen(true)} className="gap-1.5 text-xs">
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Payment</span>
              </Button>
            </CardHeader>
            <CardContent>
              {caseData.payments.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
                  <CreditCard className="w-8 h-8 mx-auto text-muted-foreground/50" />
                  <p>No payments recorded yet. Click "Add Payment" to record a payment.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date Paid</TableHead>
                        <TableHead>Reference / Transaction</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Logged At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {caseData.payments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-mono text-xs">{p.payment_date}</TableCell>
                          <TableCell className="font-mono text-xs font-bold text-primary">
                            {p.payment_reference}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            {p.currency} {p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{p.notes || "—"}</TableCell>
                          <TableCell className="text-[11px] text-muted-foreground">{p.created_at.split("T")[0]}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* TAB 4: Deterministic Calculation Breakdown */}
        {activeTab === "breakdown" && calc && (
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">Mathematical Audit Trail</CardTitle>
                  <CardDescription className="text-xs">
                    Deterministic calculation engine step-by-step verification log.
                  </CardDescription>
                </div>
                <Link href={`/cases/${caseData.id}/report`} className={buttonVariants({ variant: "outline", size: "sm", className: "gap-1.5 text-xs" })}>
                  <Printer className="w-3.5 h-3.5" />
                  <span>View Printable Report</span>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/40 p-4 rounded-lg font-mono text-xs space-y-2 border">
                {calc.step_by_step_log.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-muted-foreground select-none">[{idx + 1}]</span>
                    <span className={idx === calc.step_by_step_log.length - 1 ? "font-bold text-primary" : ""}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 border rounded-md space-y-1">
                  <div className="text-muted-foreground">Original Order Amount:</div>
                  <div className="font-bold text-sm">{calc.currency} {calc.original_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>
                <div className="p-3 border rounded-md space-y-1">
                  <div className="text-muted-foreground">Less Total Payments:</div>
                  <div className="font-bold text-sm text-emerald-600">-{calc.currency} {calc.total_paid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>
                <div className="p-3 border rounded-md space-y-1">
                  <div className="text-muted-foreground">Outstanding Principal:</div>
                  <div className="font-bold text-sm">{calc.currency} {calc.outstanding_principal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>
                <div className="p-3 border rounded-md space-y-1">
                  <div className="text-muted-foreground">Accrued Interest + Default Penalty:</div>
                  <div className="font-bold text-sm text-amber-600">+{calc.currency} {(calc.accrued_interest + calc.default_interest_or_penalty).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* TAB 5: Extracted Agreement Terms */}
        {activeTab === "agreement" && agr && (
          <Card className="shadow-xs">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Agreed Terms & Conditions</CardTitle>
                <CardDescription className="text-xs">
                  Parameters extracted from: {agr.document_name || "Terms of Settlement"}
                </CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={handleOpenEditTerms} className="gap-1.5 text-xs">
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit Terms</span>
              </Button>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3 border rounded-md space-y-1">
                <div className="text-muted-foreground">Payment Frequency:</div>
                <div className="font-semibold capitalize">{agr.frequency}</div>
              </div>
              <div className="p-3 border rounded-md space-y-1">
                <div className="text-muted-foreground">Interest Rate:</div>
                <div className="font-semibold">{agr.interest_rate}% per annum</div>
              </div>
              <div className="p-3 border rounded-md space-y-1">
                <div className="text-muted-foreground">Grace Period:</div>
                <div className="font-semibold">{agr.grace_period_days} Days</div>
              </div>
              <div className="p-3 border rounded-md space-y-1">
                <div className="text-muted-foreground">Penalty Clause:</div>
                <div className="font-semibold">{agr.penalty_rate_or_fixed}% ({agr.penalty_type})</div>
              </div>
              <div className="p-3 border rounded-md space-y-1">
                <div className="text-muted-foreground">Number of Instalments:</div>
                <div className="font-semibold">{agr.instalments_count} instalments</div>
              </div>
              <div className="p-3 border rounded-md space-y-1">
                <div className="text-muted-foreground">Start Date:</div>
                <div className="font-semibold font-mono">{agr.start_date}</div>
              </div>
              <div className="p-3 border rounded-md space-y-1 sm:col-span-2 md:col-span-3">
                <div className="text-muted-foreground">Default Condition Rule:</div>
                <div className="font-semibold">{agr.default_conditions || "Standard legal default terms apply."}</div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* MODAL 1: Record Payment Dialog */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment for {caseData.defendant_name}</DialogTitle>
            <DialogDescription className="text-xs">
              Record a received payment. The system will allocate it sequentially and update the outstanding balance.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRecordPaymentSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pmt_amount" className="text-xs">Amount ({agr?.currency || "USD"})</Label>
                <Input
                  id="pmt_amount"
                  type="number"
                  step="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pmt_date" className="text-xs">Payment Date</Label>
                <Input
                  id="pmt_date"
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pmt_ref" className="text-xs">Payment Reference / Cheque # / Slip</Label>
              <Input
                id="pmt_ref"
                placeholder="e.g. CHQ-994821 or BANK-REF-001"
                required
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pmt_notes" className="text-xs">Notes / Observations</Label>
              <Input
                id="pmt_notes"
                placeholder="e.g. Paid via debtor's legal counsel"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsPaymentOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmittingPayment}>
                {isSubmittingPayment ? "Processing..." : "Save Payment & Update Balance"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Modify / Edit Terms Dialog */}
      <Dialog open={isEditTermsOpen} onOpenChange={setIsEditTermsOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-primary" />
              <span>Modify Agreement Terms & Defendant Details</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Update agreement terms, payment amounts, interest rates, or debtor info. Recalculations will update automatically.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveTermsSubmit} className="space-y-4 py-2 text-xs">
            {/* Defendant Info */}
            <div className="border rounded-lg p-3 space-y-3 bg-muted/10">
              <span className="font-bold text-foreground block">Defendant Information</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="edit_def_name" className="text-[11px]">Defendant Name</Label>
                  <Input
                    id="edit_def_name"
                    value={editFormData.defendant_name || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, defendant_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit_def_contact" className="text-[11px]">Contact Phone/Email</Label>
                  <Input
                    id="edit_def_contact"
                    value={editFormData.defendant_contact || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, defendant_contact: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit_def_addr" className="text-[11px]">Address</Label>
                  <Input
                    id="edit_def_addr"
                    value={editFormData.defendant_address || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, defendant_address: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Financial Terms */}
            <div className="border rounded-lg p-3 space-y-3">
              <span className="font-bold text-foreground block">Financial Terms</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="edit_orig_amt" className="text-[11px]">Total Agreed Amount</Label>
                  <Input
                    id="edit_orig_amt"
                    type="number"
                    step="0.01"
                    value={editFormData.original_amount ?? ""}
                    onChange={(e) => setEditFormData({ ...editFormData, original_amount: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit_curr" className="text-[11px]">Currency</Label>
                  <Input
                    id="edit_curr"
                    value={editFormData.currency || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, currency: e.target.value.toUpperCase() })}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit_freq" className="text-[11px]">Payment Frequency</Label>
                  <select
                    id="edit_freq"
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs"
                    value={editFormData.frequency || "monthly"}
                    onChange={(e) => setEditFormData({ ...editFormData, frequency: e.target.value })}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="lump_sum">Lump Sum</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="edit_start_date" className="text-[11px]">Start Due Date</Label>
                  <Input
                    id="edit_start_date"
                    type="date"
                    value={editFormData.start_date || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit_inst_count" className="text-[11px]">No. of Instalments</Label>
                  <Input
                    id="edit_inst_count"
                    type="number"
                    min="1"
                    value={editFormData.instalments_count ?? 1}
                    onChange={(e) => setEditFormData({ ...editFormData, instalments_count: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit_int_rate" className="text-[11px]">Interest Rate (% p.a.)</Label>
                  <Input
                    id="edit_int_rate"
                    type="number"
                    step="0.1"
                    value={editFormData.interest_rate ?? 0}
                    onChange={(e) => setEditFormData({ ...editFormData, interest_rate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="edit_grace" className="text-[11px]">Grace Period (Days)</Label>
                  <Input
                    id="edit_grace"
                    type="number"
                    min="0"
                    value={editFormData.grace_period_days ?? 0}
                    onChange={(e) => setEditFormData({ ...editFormData, grace_period_days: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit_pen_type" className="text-[11px]">Penalty Type</Label>
                  <select
                    id="edit_pen_type"
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs"
                    value={editFormData.penalty_type || "percentage"}
                    onChange={(e) => setEditFormData({ ...editFormData, penalty_type: e.target.value })}
                  >
                    <option value="percentage">Percentage on Arrears (%)</option>
                    <option value="per_day">Per-Day Penalty</option>
                    <option value="fixed_fee">Fixed Fee</option>
                    <option value="none">None</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit_pen_val" className="text-[11px]">Penalty Value</Label>
                  <Input
                    id="edit_pen_val"
                    type="number"
                    step="0.1"
                    value={editFormData.penalty_rate_or_fixed ?? 0}
                    onChange={(e) => setEditFormData({ ...editFormData, penalty_rate_or_fixed: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit_cond" className="text-[11px]">Default Conditions Clause</Label>
                <Input
                  id="edit_cond"
                  value={editFormData.default_conditions || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, default_conditions: e.target.value })}
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="regen_schedule"
                  checked={editFormData.regenerate_schedule || false}
                  onChange={(e) => setEditFormData({ ...editFormData, regenerate_schedule: e.target.checked })}
                  className="rounded border-input text-primary focus:ring-primary"
                />
                <Label htmlFor="regen_schedule" className="text-xs cursor-pointer font-medium text-foreground">
                  Regenerate full payment schedule according to new amounts/dates
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEditTermsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSavingTerms} className="font-bold">
                {isSavingTerms ? "Saving Changes..." : "Save Changes & Recalculate"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: Edit Specific Instalment Item Dialog */}
      <Dialog open={editingInstalment !== null} onOpenChange={(open) => !open && setEditingInstalment(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Instalment #{editingInstalment?.instalment_number}</DialogTitle>
            <DialogDescription className="text-xs">
              Adjust the specific due date or amount due for this instalment.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveInstalmentSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="item_due_date" className="text-xs">Due Date</Label>
              <Input
                id="item_due_date"
                type="date"
                required
                value={editInstalmentDate}
                onChange={(e) => setEditInstalmentDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="item_amount" className="text-xs">Amount Due ({agr?.currency})</Label>
              <Input
                id="item_amount"
                type="number"
                step="0.01"
                required
                value={editInstalmentAmount}
                onChange={(e) => setEditInstalmentAmount(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="item_notes" className="text-xs">Notes / Extension Justification</Label>
              <Input
                id="item_notes"
                placeholder="e.g. Debtor requested agreed 14-day extension"
                value={editInstalmentNotes}
                onChange={(e) => setEditInstalmentNotes(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setEditingInstalment(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSavingInstalment}>
                {isSavingInstalment ? "Saving..." : "Save Instalment & Recalculate"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
