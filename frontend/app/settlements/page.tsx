"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  FileCheck2, 
  Plus, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  ArrowRight,
  TrendingDown,
  Building2,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getCases, CaseDetail } from "@/lib/api";

export default function SettlementsPage() {
  const [cases, setCases] = useState<CaseDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "breached" | "on_track">("all");

  useEffect(() => {
    fetchSettlements();
  }, []);

  const fetchSettlements = async () => {
    try {
      setLoading(true);
      const data = await getCases("settlement");
      setCases(data);
    } catch (err) {
      console.error("Failed to load settlements:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      c.defendant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.case_number.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    if (filterStatus === "breached") return c.is_breached;
    if (filterStatus === "on_track") return !c.is_breached;
    return true;
  });

  const totalSettlements = cases.length;
  const breachedCount = cases.filter((c) => c.is_breached).length;
  const onTrackCount = cases.filter((c) => !c.is_breached).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Settlement Accounts
            </h1>
            <Badge variant="outline" className="text-xs font-semibold">
              Universal Merchant Bank
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Monitor settlement agreements, milestone compliance, and automatic debt reinstatement upon breach.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link href="/cases/new-settlement">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center space-x-2 shadow-xs">
              <Plus className="w-4 h-4" />
              <span>New Settlement Account</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Settlements</span>
            <FileCheck2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{totalSettlements}</div>
          <p className="text-[11px] text-slate-400 mt-1">Registered settlement contracts</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/40 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">On Track</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{onTrackCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Milestones fully satisfied to date</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/40 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-rose-700 dark:text-rose-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Breached Accounts</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-700 dark:text-rose-400">{breachedCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Full debt reinstatement triggered</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <Input
            type="text"
            placeholder="Search defendant or suit ref..."
            className="pl-9 h-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center space-x-1.5 w-full sm:w-auto">
          <button
            onClick={() => setFilterStatus("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterStatus === "all"
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            All ({cases.length})
          </button>
          <button
            onClick={() => setFilterStatus("on_track")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterStatus === "on_track"
                ? "bg-emerald-600 text-white"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            On Track ({onTrackCount})
          </button>
          <button
            onClick={() => setFilterStatus("breached")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterStatus === "breached"
                ? "bg-rose-600 text-white"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            Breached ({breachedCount})
          </button>
        </div>
      </div>

      {/* Settlements Table / List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            Loading settlement accounts...
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
              No settlement accounts found
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Start by creating a new settlement account with milestone checkpoints and reinstatement terms.
            </p>
            <div className="mt-4">
              <Link href="/cases/new-settlement">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Create First Settlement Account
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Defendant / Client</th>
                  <th className="py-3 px-4">Settlement Target</th>
                  <th className="py-3 px-4">Total Paid</th>
                  <th className="py-3 px-4">Status Banner</th>
                  <th className="py-3 px-4">Reinstatement Exposure</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredCases.map((c) => {
                  const totalPaid = c.payments ? c.payments.reduce((s, p) => s + p.amount, 0) : 0;
                  const target = c.settlement_total || 0;
                  const percent = target > 0 ? Math.min(100, Math.round((totalPaid / target) * 100)) : 0;

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

                      <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {c.currency} {target.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {c.currency} {totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="w-24 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-1 overflow-hidden">
                          <div
                            className={`h-full ${c.is_breached ? "bg-rose-500" : "bg-emerald-500"}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {c.is_breached ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            SETTLEMENT BREACHED
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            ON TRACK
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {c.currency} {(c.reinstatement_amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          @ {c.reinstatement_interest_rate || 12}% p.a.
                        </span>
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
