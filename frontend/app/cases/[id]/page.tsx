"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Plus, 
  Edit3, 
  Trash2, 
  Archive, 
  CreditCard, 
  Scale, 
  FileCheck2, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Globe, 
  Layers, 
  History, 
  CheckCircle2, 
  AlertCircle,
  FileSpreadsheet,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  getCase, 
  recordPayment, 
  addCheckpoint, 
  addInterestTranche, 
  addFxImpactItem, 
  deleteCase, 
  archiveCase, 
  updateCase,
  CaseDetail 
} from "@/lib/api";

export default function CaseDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const caseId = unwrappedParams.id;
  const router = useRouter();

  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // As-of evaluation date state (default today)
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [isEditingAsOfDate, setIsEditingAsOfDate] = useState(false);
  const [tempAsOfDate, setTempAsOfDate] = useState<string>(new Date().toISOString().split("T")[0]);

  // Tab state
  const [activeTab, setActiveTab] = useState<"settlement" | "ledger" | "tranches" | "fx" | "payments" | "legacy_schedule">("settlement");
  const [showAllLedgerMonths, setShowAllLedgerMonths] = useState(false);

  // Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [paymentRef, setPaymentRef] = useState<string>("");
  const [paymentNotes, setPaymentNotes] = useState<string>("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Checkpoint modal
  const [isCheckpointModalOpen, setIsCheckpointModalOpen] = useState(false);
  const [cpDueDate, setCpDueDate] = useState<string>("");
  const [cpCumulative, setCpCumulative] = useState<string>("");
  const [cpAmount, setCpAmount] = useState<string>("");
  const [cpNotes, setCpNotes] = useState<string>("");
  const [isSubmittingCp, setIsSubmittingCp] = useState(false);

  // Tranche modal
  const [isTrancheModalOpen, setIsTrancheModalOpen] = useState(false);
  const [trancheEffDate, setTrancheEffDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [trancheBase, setTrancheBase] = useState<string>("14.20");
  const [trancheSpread, setTrancheSpread] = useState<string>("2.00");
  const [tranchePenal, setTranchePenal] = useState<string>("0.00");
  const [trancheNotes, setTrancheNotes] = useState<string>("");
  const [isSubmittingTranche, setIsSubmittingTranche] = useState(false);

  // FX Impact modal
  const [isFxModalOpen, setIsFxModalOpen] = useState(false);
  const [fxDueDate, setFxDueDate] = useState<string>("");
  const [fxAmount, setFxAmount] = useState<string>("");
  const [fxPaymentDate, setFxPaymentDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [fxDueRate, setFxDueRate] = useState<string>("");
  const [fxActualRate, setFxActualRate] = useState<string>("");
  const [fxLocalCurr, setFxLocalCurr] = useState<string>("GHS");
  const [fxNotes, setFxNotes] = useState<string>("");
  const [isSubmittingFx, setIsSubmittingFx] = useState(false);

  // Load account
  const loadAccount = async (targetDate?: string) => {
    try {
      setLoading(true);
      const evalDate = targetDate !== undefined ? targetDate : asOfDate;
      const data = await getCase(caseId, evalDate);
      setCaseData(data);
      
      // Auto-set tab based on account type
      if (data.account_type === "judgment_debt") {
        setActiveTab("ledger");
      } else {
        setActiveTab("settlement");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load account details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccount();
  }, [caseId]);

  const handleApplyAsOfDate = async (e: React.FormEvent) => {
    e.preventDefault();
    setAsOfDate(tempAsOfDate);
    setIsEditingAsOfDate(false);
    await loadAccount(tempAsOfDate);
  };

  // Record payment
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      alert("Please enter a valid payment amount greater than zero.");
      return;
    }
    setIsSubmittingPayment(true);
    try {
      const updated = await recordPayment(caseId, {
        amount: amt,
        payment_date: paymentDate,
        currency: caseData?.currency || "USD",
        payment_reference: paymentRef.trim() || `RCPT-${Date.now().toString().slice(-6)}`,
        notes: paymentNotes.trim() || undefined,
      });
      setCaseData(updated);
      setIsPaymentModalOpen(false);
      setPaymentAmount("");
      setPaymentRef("");
      setPaymentNotes("");
      await loadAccount(asOfDate);
    } catch (err: any) {
      alert(err?.message || "Failed to record payment");
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Add Checkpoint
  const handleCheckpointSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cum = parseFloat(cpCumulative);
    if (isNaN(cum) || cum <= 0) {
      alert("Please enter a valid cumulative milestone target.");
      return;
    }
    setIsSubmittingCp(true);
    try {
      const updated = await addCheckpoint(caseId, {
        due_date: cpDueDate,
        cumulative_required: cum,
        amount_required: parseFloat(cpAmount) || 0,
        notes: cpNotes.trim() || undefined,
      });
      setCaseData(updated);
      setIsCheckpointModalOpen(false);
      setCpCumulative("");
      setCpAmount("");
      setCpNotes("");
      await loadAccount(asOfDate);
    } catch (err: any) {
      alert(err?.message || "Failed to add milestone checkpoint");
    } finally {
      setIsSubmittingCp(false);
    }
  };

  // Add Tranche
  const handleTrancheSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingTranche(true);
    try {
      const updated = await addInterestTranche(caseId, {
        effective_from: trancheEffDate,
        base_rate: parseFloat(trancheBase) || 0,
        spread: parseFloat(trancheSpread) || 0,
        penal_rate: parseFloat(tranchePenal) || 0,
        notes: trancheNotes.trim() || undefined,
      });
      setCaseData(updated);
      setIsTrancheModalOpen(false);
      setTrancheNotes("");
      await loadAccount(asOfDate);
    } catch (err: any) {
      alert(err?.message || "Failed to add rate tranche");
    } finally {
      setIsSubmittingTranche(false);
    }
  };

  // Add FX Item
  const handleFxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(fxAmount);
    const dRate = parseFloat(fxDueRate);
    const aRate = parseFloat(fxActualRate);
    if (isNaN(amt) || isNaN(dRate) || isNaN(aRate)) {
      alert("Please provide valid numbers for amount and FX conversion rates.");
      return;
    }
    setIsSubmittingFx(true);
    try {
      const updated = await addFxImpactItem(caseId, {
        obligation_due_date: fxDueDate,
        amount_contract_curr: amt,
        payment_date: fxPaymentDate,
        due_date_rate: dRate,
        actual_payment_rate: aRate,
        local_currency: fxLocalCurr,
        notes: fxNotes.trim() || undefined,
      });
      setCaseData(updated);
      setIsFxModalOpen(false);
      setFxAmount("");
      setFxDueRate("");
      setFxActualRate("");
      setFxNotes("");
      await loadAccount(asOfDate);
    } catch (err: any) {
      alert(err?.message || "Failed to record FX impact item");
    } finally {
      setIsSubmittingFx(false);
    }
  };

  // Archive & Delete
  const handleArchive = async () => {
    if (!confirm(`Are you sure you want to ${caseData?.is_archived ? "unarchive" : "archive"} this account?`)) return;
    try {
      await archiveCase(caseId);
      await loadAccount(asOfDate);
    } catch (err: any) {
      alert("Failed to update archive status: " + err?.message);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to PERMANENTLY DELETE this account and all associated records? This cannot be undone.")) return;
    try {
      await deleteCase(caseId);
      router.push("/cases");
    } catch (err: any) {
      alert("Failed to delete account: " + err?.message);
    }
  };

  if (loading && !caseData) {
    return (
      <div className="p-16 text-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-slate-500" />
        <p className="text-sm">Loading legal recovery account data...</p>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 text-sm">
          <AlertCircle className="w-6 h-6 mx-auto mb-2" />
          <p className="font-semibold">{error || "Account not found."}</p>
        </div>
        <Link href="/cases">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Accounts
          </Button>
        </Link>
      </div>
    );
  }

  const isSettlement = caseData.account_type === "settlement";
  const isBreached = caseData.settlement_evaluation?.is_breached ?? caseData.is_breached;
  const evalData = caseData.settlement_evaluation;
  const ledgerData = caseData.monthly_ledger;

  // Format date helper (e.g. 14 Feb 2025)
  const formatPrettyDate = (dStr?: string) => {
    if (!dStr) return "";
    try {
      const d = new Date(dStr + "T00:00:00");
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return dStr;
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Breadcrumb & Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3 text-sm text-slate-500">
          <Link
            href={isSettlement ? "/settlements" : "/cases"}
            className="inline-flex items-center space-x-1.5 hover:text-slate-900 dark:hover:text-slate-100 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to {isSettlement ? "settlement accounts" : "accounts"}</span>
          </Link>
          <span>/</span>
          <span className="font-bold text-slate-800 dark:text-slate-200">{caseData.defendant_name}</span>
        </div>

        {/* As-Of Evaluation Date Widget */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-3 py-1.5 rounded-lg shadow-xs text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500">Calculate as at:</span>
            {isEditingAsOfDate ? (
              <form onSubmit={handleApplyAsOfDate} className="flex items-center space-x-1.5">
                <input
                  type="date"
                  value={tempAsOfDate}
                  onChange={(e) => setTempAsOfDate(e.target.value)}
                  className="border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-xs bg-background text-foreground"
                />
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-0.5 rounded text-[11px] font-bold"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingAsOfDate(false)}
                  className="text-slate-400 hover:text-slate-600 text-[11px]"
                >
                  ✕
                </button>
              </form>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {formatPrettyDate(asOfDate)}
                </span>
                <button
                  onClick={() => {
                    setTempAsOfDate(asOfDate);
                    setIsEditingAsOfDate(true);
                  }}
                  className="text-emerald-600 hover:text-emerald-700 text-xs font-semibold flex items-center space-x-0.5"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit</span>
                </button>
              </div>
            )}
          </div>

          <Button
            onClick={() => setIsPaymentModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center space-x-1.5 text-xs h-8 px-3 shadow-xs"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Record Payment</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleArchive}
            title={caseData.is_archived ? "Unarchive account" : "Archive account"}
            className="h-8 text-xs text-slate-500"
          >
            <Archive className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            title="Delete account permanently"
            className="h-8 text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Account Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">
              {caseData.defendant_name}
            </h1>
            <Badge
              variant="outline"
              className={`text-xs uppercase font-bold py-0.5 px-2 ${
                isSettlement
                  ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10"
                  : "border-blue-500/40 text-blue-700 dark:text-blue-400 bg-blue-500/10"
              }`}
            >
              {isSettlement ? "Settlement Account" : "Judgment Debt Court Order"}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-500">
            <span>Suit Ref: <strong className="text-slate-700 dark:text-slate-300">{caseData.case_number || "Pending"}</strong></span>
            <span>•</span>
            <span>Court: <strong className="text-slate-700 dark:text-slate-300">{caseData.court_name || "Commercial Court"}</strong></span>
            <span>•</span>
            <span>Creditor: <strong className="text-slate-700 dark:text-slate-300">{caseData.plaintiff_name}</strong></span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-right">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Contract Currency
            </span>
            <span className="text-xl font-black text-slate-900 dark:text-slate-100">
              {caseData.currency}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SETTLEMENT ACCOUNT VIEW (Images 2, 3, 4, 5) */}
      {/* ========================================================================= */}
      {isSettlement && (
        <div className="space-y-6">
          {/* Dynamic Status Banner (Image 2 vs Image 5) */}
          {isBreached ? (
            /* RED BANNER: SETTLEMENT BREACHED (Image 2) */
            <div className="bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-900/60 rounded-xl p-5 shadow-xs">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h2 className="text-base font-black text-rose-900 dark:text-rose-200 tracking-wide uppercase">
                      SETTLEMENT BREACHED
                    </h2>
                    <span className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                      Evaluated as at {formatPrettyDate(asOfDate)}
                    </span>
                  </div>
                  <p className="text-xs text-rose-800 dark:text-rose-300 mt-1">
                    Settlement terms breached. The discounted settlement agreement is revoked and the full reinstated debt is currently due with interest.
                  </p>

                  {/* Banner Key Figures Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-3 border-t border-rose-200 dark:border-rose-900/60">
                    <div>
                      <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider block">
                        Reinstated Amount Due
                      </span>
                      <span className="text-2xl font-black text-rose-950 dark:text-rose-100">
                        {caseData.currency} {(evalData?.reinstated_amount_due ?? (caseData.reinstatement_amount || 0)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider block">
                        Total Paid to Date
                      </span>
                      <span className="text-2xl font-black text-slate-800 dark:text-slate-200">
                        {caseData.currency} {(evalData?.total_paid ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider block">
                        Original Settlement
                      </span>
                      <span className="text-2xl font-black text-slate-800 dark:text-slate-200">
                        {caseData.currency} {(caseData.settlement_total || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* GREEN BANNER: ON TRACK (Image 5) */
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-900/60 rounded-xl p-5 shadow-xs">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h2 className="text-base font-black text-emerald-900 dark:text-emerald-200 tracking-wide uppercase">
                      ON TRACK
                    </h2>
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      Evaluated as at {formatPrettyDate(asOfDate)}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-1">
                    All payment milestones are currently satisfied. Debtor is in full compliance with agreed settlement terms.
                  </p>

                  {/* Banner Key Figures Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-3 border-t border-emerald-200 dark:border-emerald-900/60">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                        Next Checkpoint Target
                      </span>
                      <span className="text-2xl font-black text-emerald-950 dark:text-emerald-100">
                        {caseData.currency} {(evalData?.next_checkpoint_target ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      {evalData?.next_checkpoint_date && (
                        <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block mt-0.5">
                          Due by {formatPrettyDate(evalData.next_checkpoint_date)}
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                        Total Paid to Date
                      </span>
                      <span className="text-2xl font-black text-slate-800 dark:text-slate-200">
                        {caseData.currency} {(evalData?.total_paid ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                        Remaining Under Settlement
                      </span>
                      <span className="text-2xl font-black text-slate-800 dark:text-slate-200">
                        {caseData.currency} {(evalData?.remaining_under_settlement ?? Math.max(0, (caseData.settlement_total || 0) - (evalData?.total_paid || 0))).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Settlement Terms vs Reinstatement Terms Cards (Images 2 & 5) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Settlement terms card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 border-b pb-2 border-slate-100 dark:border-slate-800">
                Settlement Terms
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
                  <span className="text-slate-500">Settlement Total</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {caseData.currency} {(caseData.settlement_total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
                  <span className="text-slate-500">Total Paid to Date</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {caseData.currency} {(evalData?.total_paid ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Compliance Status</span>
                  <span className={`font-bold ${isBreached ? "text-rose-600" : "text-emerald-600"}`}>
                    {isBreached ? "Breached on milestone" : "On Track"}
                  </span>
                </div>
              </div>
            </div>

            {/* Reinstatement terms card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 border-b pb-2 border-slate-100 dark:border-slate-800">
                Reinstatement Terms
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
                  <span className="text-slate-500">Reinstatement Debt</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {caseData.currency} {(caseData.reinstatement_amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
                  <span className="text-slate-500">Interest Rate (% p.a.)</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {caseData.reinstatement_interest_rate || 12}% p.a.
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Interest Accrual Start Date</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {formatPrettyDate(caseData.interest_accrual_start_date)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Module Navigation Tabs: Checkpoints | Currency Gain/Loss | Payments */}
          <div className="border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setActiveTab("settlement")}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center space-x-1.5 ${
                  activeTab === "settlement"
                    ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Payment Schedule / Milestones ({evalData?.checkpoints?.length ?? caseData.checkpoints?.length ?? 0})</span>
              </button>

              <button
                onClick={() => setActiveTab("fx")}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center space-x-1.5 ${
                  activeTab === "fx"
                    ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Currency Gain / Loss ({caseData.currency_gain_losses?.length ?? 0})</span>
              </button>

              <button
                onClick={() => setActiveTab("payments")}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center space-x-1.5 ${
                  activeTab === "payments"
                    ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Payments Received ({caseData.payments?.length ?? 0})</span>
              </button>
            </div>

            {activeTab === "settlement" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsCheckpointModalOpen(true)}
                className="text-xs h-7 mb-1"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Milestone
              </Button>
            )}

            {activeTab === "fx" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsFxModalOpen(true)}
                className="text-xs h-7 mb-1"
              >
                <Plus className="w-3 h-3 mr-1" />
                Record FX Item
              </Button>
            )}
          </div>

          {/* TAB CONTENT: Payment Schedule / Milestones (Image 2 & 5) */}
          {activeTab === "settlement" && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Milestone</th>
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4">Cumulative Required</th>
                      <th className="py-3 px-4">Actually Paid by Then</th>
                      <th className="py-3 px-4">Milestone Status</th>
                      <th className="py-3 px-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(evalData?.checkpoints ?? caseData.checkpoints ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          No milestone checkpoints registered for this settlement.
                        </td>
                      </tr>
                    ) : (
                      (evalData?.checkpoints ?? caseData.checkpoints ?? []).map((cp) => (
                        <tr key={cp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                            Checkpoint {cp.checkpoint_number}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                            {formatPrettyDate(cp.due_date)}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                            {caseData.currency} {cp.cumulative_required.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                            {caseData.currency} {(cp.actually_paid_by_then ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4">
                            {cp.status === "met" ? (
                              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 hover:bg-emerald-100">
                                Met
                              </Badge>
                            ) : cp.status === "missed" ? (
                              <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200 hover:bg-rose-100">
                                Missed
                              </Badge>
                            ) : cp.status === "on_track" ? (
                              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 hover:bg-blue-100">
                                On Track
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-slate-500">
                                Not Due
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-400">
                            {cp.notes || "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB CONTENT: Currency Gain / Loss Analysis (Image 4) */}
          {activeTab === "fx" && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Foreign Exchange (FX) Gain / Loss on Receipts
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Compares payment date conversion rates against due date conversion rates.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4">Amount ({caseData.currency})</th>
                      <th className="py-3 px-4">Payment Date</th>
                      <th className="py-3 px-4">Due Date Rate</th>
                      <th className="py-3 px-4">Payment Date Rate</th>
                      <th className="py-3 px-4">Impact on Creditor</th>
                      <th className="py-3 px-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(caseData.currency_gain_losses ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          No currency gain/loss conversions recorded yet. Click "Record FX Item" to add.
                        </td>
                      </tr>
                    ) : (
                      caseData.currency_gain_losses.map((fx) => (
                        <tr key={fx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                            {formatPrettyDate(fx.obligation_due_date)}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                            {caseData.currency} {fx.amount_contract_curr.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                            {formatPrettyDate(fx.payment_date)}
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold">
                            {fx.due_date_rate.toFixed(4)}
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold">
                            {fx.actual_payment_rate.toFixed(4)}
                          </td>
                          <td className="py-3 px-4 font-bold">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] ${
                                fx.local_currency_impact >= 0
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              }`}
                            >
                              {fx.local_currency_impact >= 0 ? "+" : ""}
                              {fx.local_currency} {fx.local_currency_impact.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-400">
                            {fx.notes || "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB CONTENT: Payments Received */}
          {activeTab === "payments" && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Payment Date</th>
                      <th className="py-3 px-4">Amount Paid</th>
                      <th className="py-3 px-4">Reference</th>
                      <th className="py-3 px-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(caseData.payments ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400">
                          No payments recorded yet. Click "Record Payment" to log receipts.
                        </td>
                      </tr>
                    ) : (
                      caseData.payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                            {formatPrettyDate(p.payment_date)}
                          </td>
                          <td className="py-3 px-4 font-black text-emerald-600 dark:text-emerald-400 text-sm">
                            {p.currency || caseData.currency} {p.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                            {p.payment_reference}
                          </td>
                          <td className="py-3 px-4 text-slate-400">
                            {p.notes || "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* JUDGMENT DEBT ACCOUNT VIEW (Image 1) */}
      {/* ========================================================================= */}
      {!isSettlement && (
        <div className="space-y-6">
          {/* Top Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Judgment Debt Principal
              </span>
              <span className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1 block">
                {caseData.currency} {(caseData.settlement_total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Ordered on {formatPrettyDate(caseData.judgment_date)}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Costs Awarded
              </span>
              <span className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1 block">
                {caseData.currency} {(caseData.cost_awarded || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-400 mt-1 block">Legal Court Costs</span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Accrued Interest to Date
              </span>
              <span className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1 block">
                {caseData.currency} {(ledgerData?.total_cumulative_interest ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-400 mt-1 block">Method: Days / 360</span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/60 rounded-xl p-4 shadow-xs bg-blue-50/20">
              <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider block">
                Total Balance Owed
              </span>
              <span className="text-xl font-black text-blue-950 dark:text-blue-100 mt-1 block">
                {caseData.currency} {(ledgerData?.total_amount_owed ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 block">
                Total Paid: {caseData.currency} {(ledgerData?.total_paid ?? 0).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Rate Tranches Section (Base + Spread + Penal) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Interest Rate History & Tranches
                </h3>
                <p className="text-xs text-slate-400">
                  Variable interest rates: All-in Rate = Base Rate + Spread + Penal Rate
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsTrancheModalOpen(true)}
                className="text-xs h-8"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Rate Tranche
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-2.5 px-3">Effective From</th>
                    <th className="py-2.5 px-3">Base Rate</th>
                    <th className="py-2.5 px-3">Spread</th>
                    <th className="py-2.5 px-3">Penal Rate</th>
                    <th className="py-2.5 px-3">All-In Rate (% p.a.)</th>
                    <th className="py-2.5 px-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(caseData.interest_tranches ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-slate-400">
                        No interest rate tranches recorded. Click "Add Rate Tranche".
                      </td>
                    </tr>
                  ) : (
                    caseData.interest_tranches.map((tr) => (
                      <tr key={tr.id}>
                        <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                          {formatPrettyDate(tr.effective_from)}
                        </td>
                        <td className="py-2.5 px-3">{tr.base_rate.toFixed(2)}%</td>
                        <td className="py-2.5 px-3">{tr.spread.toFixed(2)}%</td>
                        <td className="py-2.5 px-3">{tr.penal_rate.toFixed(2)}%</td>
                        <td className="py-2.5 px-3 font-black text-blue-600 dark:text-blue-400 text-sm">
                          {tr.all_in_rate.toFixed(2)}%
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">{tr.notes || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Monthly Ledger Table (Image 1) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Monthly Financial Ledger
                </h3>
                <p className="text-xs text-slate-400">
                  Calculation formula: Balance × All-In Rate × (Days / 360)
                </p>
              </div>

              {ledgerData && ledgerData.rows.length > 12 && (
                <button
                  onClick={() => setShowAllLedgerMonths(!showAllLedgerMonths)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 underline"
                >
                  {showAllLedgerMonths
                    ? `Show recent 12 months`
                    : `Show all ${ledgerData.rows.length} months`}
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    <th className="py-3 px-3">#</th>
                    <th className="py-3 px-4">Period</th>
                    <th className="py-3 px-3 text-center">Days</th>
                    <th className="py-3 px-3">Rate (% p.a.)</th>
                    <th className="py-3 px-4">Principal Balance</th>
                    <th className="py-3 px-3">Payment</th>
                    <th className="py-3 px-4">Interest Due</th>
                    <th className="py-3 px-4">Cumulative Interest</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {!ledgerData || ledgerData.rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No ledger rows generated yet.
                      </td>
                    </tr>
                  ) : (
                    (showAllLedgerMonths ? ledgerData.rows : ledgerData.rows.slice(0, 12)).map((row) => (
                      <tr key={row.index} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3 text-slate-400">{row.index}</td>
                        <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                          {row.period}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-600 dark:text-slate-400">
                          {row.days}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-blue-600 dark:text-blue-400">
                          {row.all_in_rate.toFixed(2)}%
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                          {caseData.currency} {row.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-emerald-600 dark:text-emerald-400">
                          {row.payment ? `${caseData.currency} ${row.payment.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "-"}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                          {caseData.currency} {row.interest_due.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                          {caseData.currency} {row.cumulative_interest.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* 1. Record Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Record Payment Receipt
            </h3>
            <p className="text-xs text-slate-500">
              Log an incoming payment from {caseData.defendant_name}. Calculations will refresh immediately.
            </p>

            <form onSubmit={handlePaymentSubmit} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Amount ({caseData.currency}) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g. 500000.00"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Date *
                </label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reference / Receipt Number
                </label>
                <Input
                  type="text"
                  placeholder="e.g. UMB-TX-88291"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Cheque clearance / Bank wire"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPaymentModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-4"
                >
                  {isSubmittingPayment ? "Saving..." : "Save Payment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Add Milestone Checkpoint Modal */}
      {isCheckpointModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Add Settlement Milestone Checkpoint
            </h3>
            <p className="text-xs text-slate-500">
              Add a cumulative milestone checkpoint to evaluate settlement compliance.
            </p>

            <form onSubmit={handleCheckpointSubmit} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Due Date *
                </label>
                <Input
                  type="date"
                  value={cpDueDate}
                  onChange={(e) => setCpDueDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Cumulative Target ({caseData.currency}) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 1000000.00"
                  value={cpCumulative}
                  onChange={(e) => setCpCumulative(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Single Tranche Amount ({caseData.currency})
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 500000.00"
                  value={cpAmount}
                  onChange={(e) => setCpAmount(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Milestone Notes
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Tranche 2 instalment"
                  value={cpNotes}
                  onChange={(e) => setCpNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCheckpointModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingCp}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-4"
                >
                  {isSubmittingCp ? "Adding..." : "Add Checkpoint"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Add Interest Tranche Modal */}
      {isTrancheModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Add Interest Rate Tranche
            </h3>
            <p className="text-xs text-slate-500">
              Configure variable interest rate terms effective from a specific date.
            </p>

            <form onSubmit={handleTrancheSubmit} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Effective From *
                </label>
                <Input
                  type="date"
                  value={trancheEffDate}
                  onChange={(e) => setTrancheEffDate(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Base Rate %
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={trancheBase}
                    onChange={(e) => setTrancheBase(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Spread %
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={trancheSpread}
                    onChange={(e) => setTrancheSpread(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Penal %
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={tranchePenal}
                    onChange={(e) => setTranchePenal(e.target.value)}
                  />
                </div>
              </div>

              <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-lg text-center border border-blue-200 dark:border-blue-900">
                <span className="text-[11px] text-blue-600 dark:text-blue-400 font-bold uppercase block">
                  All-In Effective Rate
                </span>
                <span className="text-lg font-black text-slate-900 dark:text-slate-100">
                  {((parseFloat(trancheBase) || 0) + (parseFloat(trancheSpread) || 0) + (parseFloat(tranchePenal) || 0)).toFixed(2)}%
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes / Source
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Bank of Ghana Policy Rate Revision"
                  value={trancheNotes}
                  onChange={(e) => setTrancheNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsTrancheModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingTranche}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 px-4"
                >
                  {isSubmittingTranche ? "Saving..." : "Add Tranche"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Add FX Item Modal */}
      {isFxModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Record Currency FX Impact Item
            </h3>
            <p className="text-xs text-slate-500">
              Compare payment date FX conversion rate against milestone due date FX rate (Image 4).
            </p>

            <form onSubmit={handleFxSubmit} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Obligation Due Date *
                  </label>
                  <Input
                    type="date"
                    value={fxDueDate}
                    onChange={(e) => setFxDueDate(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Date *
                  </label>
                  <Input
                    type="date"
                    value={fxPaymentDate}
                    onChange={(e) => setFxPaymentDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Amount in Contract Currency ({caseData.currency}) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 500000.00"
                  value={fxAmount}
                  onChange={(e) => setFxAmount(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Due Date FX Rate *
                  </label>
                  <Input
                    type="number"
                    step="0.0001"
                    placeholder="e.g. 7.1128"
                    value={fxDueRate}
                    onChange={(e) => setFxDueRate(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Date FX Rate *
                  </label>
                  <Input
                    type="number"
                    step="0.0001"
                    placeholder="e.g. 7.2245"
                    value={fxActualRate}
                    onChange={(e) => setFxActualRate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Delayed remittance impact"
                  value={fxNotes}
                  onChange={(e) => setFxNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFxModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingFx}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-4"
                >
                  {isSubmittingFx ? "Recording..." : "Record FX Item"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
