"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  Scale, 
  CheckCircle2, 
  AlertCircle, 
  Loader2 
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createJudgmentDebtAccount } from "@/lib/api";

export default function NewJudgmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Judgment Debt fields (Image 1)
  const [defendantName, setDefendantName] = useState("");
  const [caseNumber, setCaseNumber] = useState("");
  const [courtName, setCourtName] = useState("High Court of Justice (Commercial Division), Accra");
  const [currency, setCurrency] = useState("GHS");
  const [judgmentDebt, setJudgmentDebt] = useState<string>("");
  const [judgmentDate, setJudgmentDate] = useState<string>("");
  const [costAwarded, setCostAwarded] = useState<string>("0");
  const [interestMethod, setInterestMethod] = useState("simple_30_360");

  // Initial Tranche
  const [baseRate, setBaseRate] = useState<string>("14.20");
  const [spread, setSpread] = useState<string>("2.00");
  const [penalRate, setPenalRate] = useState<string>("0.00");
  const [trancheNotes, setTrancheNotes] = useState("Initial Court Judgment Rate");

  const allInRate = (
    (parseFloat(baseRate) || 0) +
    (parseFloat(spread) || 0) +
    (parseFloat(penalRate) || 0)
  ).toFixed(2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!defendantName.trim()) {
      setError("Defendant / Client name is required.");
      return;
    }
    const debt = parseFloat(judgmentDebt);
    if (isNaN(debt) || debt <= 0) {
      setError("Please enter a valid Judgment Debt principal amount.");
      return;
    }
    if (!judgmentDate) {
      setError("Please select the Judgment Date.");
      return;
    }

    setLoading(true);
    try {
      const created = await createJudgmentDebtAccount({
        defendant_name: defendantName.trim(),
        case_number: caseNumber.trim() || undefined,
        court_name: courtName.trim() || undefined,
        currency,
        judgment_debt: debt,
        judgment_date: judgmentDate,
        cost_awarded: parseFloat(costAwarded) || 0,
        interest_method: interestMethod,
        initial_tranche: {
          effective_from: judgmentDate,
          base_rate: parseFloat(baseRate) || 0,
          spread: parseFloat(spread) || 0,
          penal_rate: parseFloat(penalRate) || 0,
          notes: trancheNotes,
        },
      });

      router.push(`/cases/${created.id}`);
    } catch (err: any) {
      setError(err?.message || "Failed to create judgment debt account.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      <div className="flex items-center space-x-3 text-sm text-slate-500 mb-2">
        <Link
          href="/cases"
          className="inline-flex items-center space-x-1 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to accounts</span>
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                New Judgment Debt Court Order
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Register a court-ordered judgment debt with variable interest rate tranches and monthly day-count ledger.
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

          {/* Section 1: Court Judgment Information */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 border-b pb-1 border-slate-200 dark:border-slate-800">
              Court Order Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Defendant / Debtor Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Kwabena Mensah"
                  value={defendantName}
                  onChange={(e) => setDefendantName(e.target.value)}
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
                  <option value="GHS">₵ GHS - Ghana Cedi</option>
                  <option value="USD">$ USD - US Dollar</option>
                  <option value="EUR">€ EUR - Euro</option>
                  <option value="GBP">£ GBP - British Pound</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Suit / Case Number
                </label>
                <Input
                  type="text"
                  placeholder="e.g. HC/2022/ACCRA/089"
                  value={caseNumber}
                  onChange={(e) => setCaseNumber(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Court / Division
                </label>
                <Input
                  type="text"
                  placeholder="e.g. High Court of Justice (Commercial Division), Accra"
                  value={courtName}
                  onChange={(e) => setCourtName(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Principal, Costs, Judgment Date & Method */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 border-b pb-1 border-slate-200 dark:border-slate-800">
              Judgment Amounts & Date
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Judgment Debt Principal <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-semibold text-slate-400">
                    {currency === "GHS" ? "₵" : currency === "USD" ? "$" : currency}
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="200,000.00"
                    className="pl-8"
                    value={judgmentDebt}
                    onChange={(e) => setJudgmentDebt(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Judgment Date <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="date"
                  value={judgmentDate}
                  onChange={(e) => setJudgmentDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Costs Awarded
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-semibold text-slate-400">
                    {currency === "GHS" ? "₵" : currency === "USD" ? "$" : currency}
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="10,000.00"
                    className="pl-8"
                    value={costAwarded}
                    onChange={(e) => setCostAwarded(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Interest Method
                </label>
                <select
                  value={interestMethod}
                  onChange={(e) => setInterestMethod(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="simple_30_360">Simple Interest (Days / 360 convention - Court Standard)</option>
                  <option value="simple_actual_365">Simple Interest (Actual / 365 convention)</option>
                  <option value="compound">Monthly Compounding</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Initial Interest Rate Tranche (Image 1) */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 border-b pb-1 border-slate-200 dark:border-slate-800">
              Initial Interest Rate Tranche (Base + Spread + Penal = All-In Rate)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Base Rate (% p.a.)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="14.20"
                  value={baseRate}
                  onChange={(e) => setBaseRate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Spread (% p.a.)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="2.00"
                  value={spread}
                  onChange={(e) => setSpread(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Penal Rate (% p.a.)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={penalRate}
                  onChange={(e) => setPenalRate(e.target.value)}
                />
              </div>

              <div className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/60 p-2.5 rounded-lg text-center">
                <span className="block text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400">
                  All-In Rate
                </span>
                <span className="text-lg font-black text-slate-900 dark:text-slate-100">
                  {allInRate}%
                </span>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-3">
            <Link
              href="/cases"
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </Link>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Court Order...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Create Judgment Debt Account</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
