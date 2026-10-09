"use client";

import React, { useState } from "react";
import { 
  Settings as SettingsIcon, 
  ShieldCheck, 
  Download, 
  Scale, 
  Database, 
  CheckCircle2, 
  RefreshCw 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadFullBackup } from "@/lib/api";

export default function SettingsPage() {
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await downloadFullBackup();
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err: any) {
      alert("Failed to download backup: " + (err?.message || "Unknown error"));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          System Settings & Platform Profile
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage creditor institution defaults, deterministic calculation standards, and database backups.
        </p>
      </div>

      {/* Creditor Institution Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Creditor / Plaintiff Institution
            </h2>
            <p className="text-xs text-slate-500">
              Fixed system creditor applied across all legal claims and settlement accounts.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800">
            <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Institution Name
            </span>
            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              Universal Merchant Bank
            </span>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800">
            <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Head Office / Service Address
            </span>
            <span className="font-medium text-slate-700 dark:text-slate-300 text-sm">
              Universal Merchant Bank Building, Accra, Ghana
            </span>
          </div>
        </div>
      </div>

      {/* Calculation Standards Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Deterministic Calculation Engine Standards
            </h2>
            <p className="text-xs text-slate-500">
              Rigorous mathematical conventions compliant with Ghana Commercial Court rulings and legal settlement covenants.
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-2 text-xs text-slate-600 dark:text-slate-300">
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <span className="font-bold text-slate-900 dark:text-slate-100 block mb-0.5">
              1. Monthly Day-Count Interest Formula
            </span>
            <p className="text-slate-500 font-mono text-[11px]">
              Interest Due = Balance × (All-In Rate / 100) × (Days in Month / 360)
            </p>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <span className="font-bold text-slate-900 dark:text-slate-100 block mb-0.5">
              2. Settlement Breach & Debt Reinstatement
            </span>
            <p className="text-slate-500">
              When cumulative payments received by a milestone due date fall below the agreed cumulative target, the discounted settlement is nullified and the full reinstated amount accrues interest from the specified accrual date.
            </p>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <span className="font-bold text-slate-900 dark:text-slate-100 block mb-0.5">
              3. Foreign Exchange (FX) Gain / Loss Impact
            </span>
            <p className="text-slate-500 font-mono text-[11px]">
              Local Currency Impact = (Due Date FX Rate − Actual Payment FX Rate) × Amount Paid
            </p>
          </div>
        </div>
      </div>

      {/* Database Backup & Export Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-purple-600/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Database Export & Disaster Recovery
            </h2>
            <p className="text-xs text-slate-500">
              Export complete account records, rate tranches, monthly ledgers, and settlement milestones.
            </p>
          </div>
        </div>

        <div className="pt-2">
          <Button
            onClick={handleDownload}
            disabled={downloading}
            className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold flex items-center space-x-2"
          >
            {downloading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Generating Full JSON Backup...</span>
              </>
            ) : downloadSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Backup Downloaded Successfully</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download Full Database Backup</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
