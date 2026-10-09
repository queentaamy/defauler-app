"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  FileCheck2, 
  Calendar, 
  Plus, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Loader2 
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createSettlementAccount } from "@/lib/api";

interface CheckpointDraft {
  checkpoint_number: number;
  due_date: string;
  cumulative_required: number;
  amount_required: number;
  notes: string;
}

export default function NewSettlementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields matching Image 3
  const [clientName, setClientName] = useState("");
  const [caseNumber, setCaseNumber] = useState("");
  const [courtName, setCourtName] = useState("High Court of Justice (Commercial Division), Accra");
  const [currency, setCurrency] = useState("USD");
  const [settlementTotal, setSettlementTotal] = useState<string>("");
  const [reinstatementAmount, setReinstatementAmount] = useState<string>("");
  const [interestRate, setInterestRate] = useState<string>("12.0");
  const [accrualStartDate, setAccrualStartDate] = useState<string>("");

  // Checkpoints drafts
  const [checkpoints, setCheckpoints] = useState<CheckpointDraft[]>([
    {
      checkpoint_number: 1,
      due_date: "",
      cumulative_required: 0,
      amount_required: 0,
      notes: "First milestone",
    },
  ]);

  const addCheckpointRow = () => {
    setCheckpoints([
      ...checkpoints,
      {
        checkpoint_number: checkpoints.length + 1,
        due_date: "",
        cumulative_required: 0,
        amount_required: 0,
        notes: `Milestone ${checkpoints.length + 1}`,
      },
    ]);
  };

  const removeCheckpointRow = (index: number) => {
    if (checkpoints.length === 1) return;
    const updated = checkpoints.filter((_, i) => i !== index).map((cp, idx) => ({
      ...cp,
      checkpoint_number: idx + 1,
    }));
    setCheckpoints(updated);
  };

  const updateCheckpoint = (index: number, field: keyof CheckpointDraft, value: any) => {
    const updated = [...checkpoints];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setCheckpoints(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!clientName.trim()) {
      setError("Client name is required.");
      return;
    }
    const settTot = parseFloat(settlementTotal);
    if (isNaN(settTot) || settTot <= 0) {
      setError("Please enter a valid Settlement Total greater than zero.");
      return;
    }
    const reinstAmt = parseFloat(reinstatementAmount);
    if (isNaN(reinstAmt) || reinstAmt <= 0) {
      setError("Please enter a valid Reinstatement Amount greater than zero.");
      return;
    }
    if (!accrualStartDate) {
      setError("Please select the Interest Accrual Start Date.");
      return;
    }

    // Filter valid checkpoints
    const validCheckpoints = checkpoints
      .filter((cp) => cp.due_date && cp.cumulative_required > 0)
      .map((cp, idx) => ({
        checkpoint_number: idx + 1,
        due_date: cp.due_date,
        cumulative_required: Number(cp.cumulative_required),
        amount_required: Number(cp.amount_required || 0),
        notes: cp.notes || undefined,
      }));

    setLoading(true);
    try {
      const created = await createSettlementAccount({
        defendant_name: clientName.trim(),
        case_number: caseNumber.trim() || undefined,
        court_name: courtName.trim() || undefined,
        currency,
        settlement_total: settTot,
        reinstatement_amount: reinstAmt,
        reinstatement_interest_rate: parseFloat(interestRate) || 0,
        interest_accrual_start_date: accrualStartDate,
        checkpoints: validCheckpoints,
      });

      router.push(`/cases/${created.id}`);
    } catch (err: any) {
      setError(err?.message || "Failed to create settlement account.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-center space-x-3 text-sm text-slate-500 mb-2">
        <Link
          href="/settlements"
          className="inline-flex items-center space-x-1 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to settlement accounts</span>
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                New Settlement Account
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Enter details of the agreed settlement terms. Reinstatement clauses will evaluate automatically.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {error && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-lg text-rose-700 dark:text-rose-300 text-sm flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Basic Information */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 border-b pb-1 border-slate-200 dark:border-slate-800">
              Account Identification
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Client / Defendant Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Ghana Alu Ltd"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Currency <span className="text-rose-500">*</span>
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="USD">$ USD - US Dollar</option>
                  <option value="GHS">₵ GHS - Ghana Cedi</option>
                  <option value="EUR">€ EUR - Euro</option>
                  <option value="GBP">£ GBP - British Pound</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Case Number / Suit Ref
                </label>
                <Input
                  type="text"
                  placeholder="e.g. HC/2021/ACCRA/ALU"
                  value={caseNumber}
                  onChange={(e) => setCaseNumber(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Court / Jurisdiction
                </label>
                <Input
                  type="text"
                  placeholder="e.g. High Court of Justice (Commercial Division)"
                  value={courtName}
                  onChange={(e) => setCourtName(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Settlement & Reinstatement Terms (Image 3) */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 border-b pb-1 border-slate-200 dark:border-slate-800">
              Settlement & Reinstatement Terms
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Settlement Total <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-semibold text-slate-400">
                    {currency === "USD" ? "$" : currency === "GHS" ? "₵" : currency}
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="6,000,000.00"
                    className="pl-8"
                    value={settlementTotal}
                    onChange={(e) => setSettlementTotal(e.target.value)}
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Agreed discounted settlement total to settle full obligation.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Reinstatement Amount <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-semibold text-slate-400">
                    {currency === "USD" ? "$" : currency === "GHS" ? "₵" : currency}
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="8,256,340.67"
                    className="pl-8"
                    value={reinstatementAmount}
                    onChange={(e) => setReinstatementAmount(e.target.value)}
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  The original debt reinstated immediately upon default/breach.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Interest Rate on Reinstated Amount (% p.a.) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="12.0"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-sm font-medium text-slate-400">
                    %
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Annual interest rate applicable if settlement agreement is breached.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Interest Accrual Start Date <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="date"
                  value={accrualStartDate}
                  onChange={(e) => setAccrualStartDate(e.target.value)}
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Date from which interest accrues if breached (e.g. 2021-09-08).
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Payment Checkpoints / Milestones */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-1 border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Payment Schedule / Milestones
                </h2>
                <p className="text-xs text-slate-500">
                  Define cumulative milestone checkpoints used to evaluate settlement breaches.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCheckpointRow}
                className="text-xs flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Milestone</span>
              </Button>
            </div>

            <div className="space-y-3">
              {checkpoints.map((cp, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 grid grid-cols-1 md:grid-cols-12 gap-3 items-center"
                >
                  <div className="md:col-span-1 text-xs font-bold text-slate-500 text-center">
                    #{idx + 1}
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Due Date *
                    </label>
                    <Input
                      type="date"
                      value={cp.due_date}
                      onChange={(e) => updateCheckpoint(idx, "due_date", e.target.value)}
                      required
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Cumulative Target ({currency}) *
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 500,000"
                      value={cp.cumulative_required || ""}
                      onChange={(e) => updateCheckpoint(idx, "cumulative_required", parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Milestone Notes
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. Tranche 1 or Initial deposit"
                      value={cp.notes}
                      onChange={(e) => updateCheckpoint(idx, "notes", e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-1 flex justify-center pt-5">
                    <button
                      type="button"
                      onClick={() => removeCheckpointRow(idx)}
                      disabled={checkpoints.length === 1}
                      className="text-slate-400 hover:text-rose-500 disabled:opacity-30 p-1"
                      title="Remove milestone"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-3">
            <Link
              href="/settlements"
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </Link>
            <Button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2 rounded-lg flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Create Settlement Account</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
