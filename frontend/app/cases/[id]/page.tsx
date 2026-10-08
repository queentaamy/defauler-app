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
  Percent
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { getCase, recordPayment, recalculateCase, CaseDetail } from "@/lib/api";

export default function CaseDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const caseId = unwrappedParams.id;

  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"schedule" | "payments" | "breakdown" | "agreement">("schedule");

  // Payment Modal State
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [paymentRef, setPaymentRef] = useState<string>("");
  const [paymentNotes, setPaymentNotes] = useState<string>("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

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
        return <Badge variant="destructive" className="capitalize">Defaulted</Badge>;
      case "overdue":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 capitalize">Overdue</Badge>;
      case "settled":
        return <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 capitalize">Settled</Badge>;
      case "partially_paid":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 capitalize">Partially Paid</Badge>;
      case "paid":
        return <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-emerald-200 capitalize">Paid</Badge>;
      default:
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 capitalize">Upcoming</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="text-sm font-semibold">Loading Case #{caseId}...</div>
        <div className="text-xs text-muted-foreground">Evaluating schedules and calculating balances...</div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="py-20 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-destructive mx-auto" />
        <div className="text-base font-bold text-destructive">{error || "Case not found"}</div>
        <Link href="/cases" className={buttonVariants({ variant: "outline" })}>
          Back to Cases
        </Link>
      </div>
    );
  }

  const calc = caseData.latest_calculation;
  const agr = caseData.agreement;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-muted-foreground mb-1">
            <Link href="/cases" className="hover:underline flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" />
              <span>All Cases</span>
            </Link>
            <span>/</span>
            <span className="font-mono">{caseData.case_number}</span>
          </div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-extrabold tracking-tight font-heading">
              Case {caseData.case_number}
            </h1>
            {getStatusBadge(caseData.status)}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {caseData.court_name || "High Court of Justice"} • Registered {caseData.created_at.split("T")[0]}
          </p>
        </div>

        <div className="flex items-center space-x-2">
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

          <Link href={`/cases/${caseData.id}/report`} className={buttonVariants({ variant: "outline", size: "sm", className: "gap-1.5 text-xs" })}>
            <Printer className="w-3.5 h-3.5" />
            <span>Audit Report</span>
          </Link>

          {/* Record Payment Button */}
          <Button 
            size="sm" 
            onClick={() => setIsPaymentOpen(true)}
            className="gap-1.5 text-xs font-semibold shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Record Payment</span>
          </Button>

          {/* Record Payment Dialog */}
          <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
            <DialogContent className="sm:max-w-md">
              <form onSubmit={handleRecordPaymentSubmit}>
                <DialogHeader>
                  <DialogTitle className="text-base font-bold">Record Defendant Payment</DialogTitle>
                  <DialogDescription className="text-xs">
                    Logs a payment against the debt obligations and recalculates default status.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4 text-xs">
                  <div className="space-y-1.5">
                    <Label htmlFor="pmt_amount">Payment Amount ({agr?.currency || "USD"})</Label>
                    <Input
                      id="pmt_amount"
                      type="number"
                      step="0.01"
                      required
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="pmt_date">Date Paid</Label>
                    <Input
                      id="pmt_date"
                      type="date"
                      required
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="pmt_ref">Payment Reference / Transaction ID</Label>
                    <Input
                      id="pmt_ref"
                      required
                      placeholder="e.g. Wire Ref #99014, Check #402, Cash receipt"
                      value={paymentRef}
                      onChange={(e) => setPaymentRef(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="pmt_notes">Notes / Observations</Label>
                    <Input
                      id="pmt_notes"
                      placeholder="e.g. Paid via debtor's legal counsel"
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                    />
                  </div>
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
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-xs border-primary/20 bg-primary/5">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold uppercase text-primary">
              Current Amount Owed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">
              {agr?.currency} {(calc?.total_amount_owed ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Outstanding Principal + Interest + Penalties
            </p>
          </CardContent>
        </Card>

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
              Original debt: {agr?.currency} {(calc?.original_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              Total Payments Made
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {agr?.currency} {(calc?.total_paid ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Across {caseData.payments.length} payment records
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              Accrued Interest & Penalties
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {agr?.currency} {((calc?.accrued_interest ?? 0) + (calc?.default_interest_or_penalty ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Interest: ${calc?.accrued_interest.toFixed(2)} • Penalties: ${calc?.default_interest_or_penalty.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Parties Information Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Fixed Plaintiff Details */}
        <Card className="shadow-xs border-dashed bg-muted/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-primary font-semibold text-xs uppercase">
                <Building className="w-4 h-4" />
                <span>Plaintiff (Creditor)</span>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold">Fixed Configuration</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-1.5 text-xs">
            <div className="font-bold text-sm text-foreground">{caseData.plaintiff_name}</div>
            <div className="text-muted-foreground">{caseData.plaintiff_address || "Registered Corporate Office"}</div>
            <div className="text-muted-foreground">Contact: {caseData.plaintiff_contact || "N/A"}</div>
          </CardContent>
        </Card>

        {/* Defendant Details */}
        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center space-x-2 text-foreground font-semibold text-xs uppercase">
              <User className="w-4 h-4" />
              <span>Defendant (Debtor)</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-1.5 text-xs">
            <div className="font-bold text-sm text-foreground">{caseData.defendant_name}</div>
            <div className="text-muted-foreground">{caseData.defendant_address || "Address not provided"}</div>
            <div className="text-muted-foreground">Contact: {caseData.defendant_contact || "N/A"}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Details */}
      <div className="space-y-4">
        <div className="flex border-b space-x-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab("schedule")}
            className={`pb-2 transition-colors border-b-2 font-semibold ${
              activeTab === "schedule"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Payment Schedule ({caseData.payment_plans.length})
          </button>
          <button
            onClick={() => setActiveTab("payments")}
            className={`pb-2 transition-colors border-b-2 font-semibold ${
              activeTab === "payments"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Payment History ({caseData.payments.length})
          </button>
          <button
            onClick={() => setActiveTab("breakdown")}
            className={`pb-2 transition-colors border-b-2 font-semibold ${
              activeTab === "breakdown"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Deterministic Calculation Breakdown
          </button>
          <button
            onClick={() => setActiveTab("agreement")}
            className={`pb-2 transition-colors border-b-2 font-semibold ${
              activeTab === "agreement"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Extracted Agreement Terms
          </button>
        </div>

        {/* TAB 1: Payment Schedule */}
        {activeTab === "schedule" && (
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">Enforceable Payment Schedule</CardTitle>
              <CardDescription className="text-xs">
                Payments are automatically allocated sequentially to determine overdue and default triggers.
              </CardDescription>
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
                        <TableCell className="text-xs text-muted-foreground">
                          {item.paid_date || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* TAB 2: Payment History */}
        {activeTab === "payments" && (
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">Recorded Payment Records</CardTitle>
              <CardDescription className="text-xs">
                Chronological ledger of payments made by the defendant.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {caseData.payments.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No payments recorded yet. Click "Record Payment" to log an instalment.
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

        {/* TAB 3: Deterministic Calculation Breakdown */}
        {activeTab === "breakdown" && calc && (
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">Mathematical Audit Trail</CardTitle>
                  <CardDescription className="text-xs">
                    Generated by the deterministic calculation engine (no AI hallucination).
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

        {/* TAB 4: Extracted Agreement Terms */}
        {activeTab === "agreement" && agr && (
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">Legal Agreement Terms</CardTitle>
              <CardDescription className="text-xs">
                Terms extracted from document: {agr.document_name || "Court Order"}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3 border rounded-md space-y-1">
                <div className="text-muted-foreground">Instalment Frequency:</div>
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
                <div className="text-muted-foreground">Exchange Rate Recorded:</div>
                <div className="font-semibold">1 {agr.currency} = {agr.exchange_rate.toFixed(4)} {agr.target_currency || agr.currency}</div>
              </div>
              <div className="p-3 border rounded-md space-y-1 sm:col-span-2 md:col-span-3">
                <div className="text-muted-foreground">Default Condition Rule:</div>
                <div className="font-semibold">{agr.default_conditions || "Standard legal default terms apply."}</div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
