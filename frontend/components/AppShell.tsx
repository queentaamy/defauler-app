"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <main className="min-h-screen flex items-center justify-center p-4">{children}</main>;
  }

  return (
    <div className="flex min-h-screen bg-slate-50/50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 transition-all duration-300">
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="border-t border-slate-200 dark:border-slate-800 py-4 bg-white/70 dark:bg-slate-900/70 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>Accrue by Strategic Debt Solutions Ltd • Creditor: <strong>Universal Merchant Bank</strong></span>
            <span>Deterministic Legal Calculation Engine</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
