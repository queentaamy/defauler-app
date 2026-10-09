"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  FolderLock, 
  Plus, 
  Scale, 
  FileCheck2, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  ArrowRight,
  Building2,
  Calendar,
  CreditCard,
  UploadCloud,
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getCases, CaseDetail } from "@/lib/api";

export default function CasesListPage() {
  const [cases, setCases] = useState<CaseDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "settlement" | "judgment_debt">("all");
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, [typeFilter, showArchived]);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const filterType = typeFilter === "all" ? undefined : typeFilter;
      const data = await getCases(filterType, showArchived);
      setCases(data);
    } catch (err) {
      console.error("Failed to load accounts:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCases = cases.filter((c) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      c.defendant_name.toLowerCase().includes(term) ||
      c.case_number.toLowerCase().includes(term) ||
      (c.court_name && c.court_name.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Accounts Registry
            </h1>
            <Badge variant="outline" className="text-xs font-semibold">
              Universal Merchant Bank
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Manage debt recovery claims, milestone settlement schedules, and court judgment ledgers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/cases/new-settlement">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center space-x-1.5 text-xs h-9 shadow-xs">
              <FileCheck2 className="w-4 h-4" />
              <span>+ New Settlement Account</span>
            </Button>
          </Link>

          <Link href="/cases/new-judgment">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center space-x-1.5 text-xs h-9 shadow-xs">
              <Scale className="w-4 h-4" />
              <span>+ New Judgment Debt</span>
            </Button>
          </Link>

          <Link href="/upload">
            <Button variant="outline" className="text-xs h-9 flex items-center space-x-1.5">
              <UploadCloud className="w-4 h-4" />
              <span>Import</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <Input
            type="text"
            placeholder="Search defendant, suit ref, or court..."
            className="pl-9 h-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
            <button
              onClick={() => setTypeFilter("all")}
              className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                typeFilter === "all"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setTypeFilter("settlement")}
              className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                typeFilter === "settlement"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Settlements
            </button>
            <button
              onClick={() => setTypeFilter("judgment_debt")}
              className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                typeFilter === "judgment_debt"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Judgment Debts
            </button>
          </div>

          <label className="flex items-center space-x-1.5 text-xs text-slate-500 cursor-pointer ml-2">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500"
            />
            <span>Show archived</span>
          </label>
        </div>
      </div>

      {/* Accounts List Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            Loading accounts...
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
              No accounts registered yet
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Start by creating a new settlement account or recording a court judgment debt.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Link href="/cases/new-settlement">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  + New Settlement Account
                </Button>
              </Link>
              <Link href="/cases/new-judgment">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                  + New Judgment Debt
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Defendant / Debtor</th>
                  <th className="py-3 px-4">Account Type</th>
                  <th className="py-3 px-4">Claim / Settlement Total</th>
                  <th className="py-3 px-4">Total Paid</th>
                  <th className="py-3 px-4">Compliance Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredCases.map((c) => {
                  const isSettlement = c.account_type === "settlement";
                  const totalPaid = c.payments ? c.payments.reduce((s, p) => s + p.amount, 0) : 0;
                  const totalClaim = c.settlement_total || c.agreement?.original_amount || 0;

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <Link href={`/cases/${c.id}`} className="font-bold text-slate-900 dark:text-slate-100 hover:underline block">
                          {c.defendant_name}
                        </Link>
                        <span className="text-xs text-slate-400">
                          {c.case_number || "Suit Ref Pending"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {isSettlement ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                            <FileCheck2 className="w-3 h-3 mr-1" />
                            Settlement
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                            <Scale className="w-3 h-3 mr-1" />
                            Judgment Debt
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {c.currency} {totalClaim.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-emerald-600 dark:text-emerald-400">
                        {c.currency} {totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-4">
                        {isSettlement ? (
                          c.is_breached ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              BREACHED
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              ON TRACK
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                            ACTIVE ORDER
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <Link href={`/cases/${c.id}`}>
                          <Button size="sm" variant="outline" className="text-xs h-8">
                            <span>Open Details</span>
                            <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
