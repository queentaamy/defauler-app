"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FolderLock,
  Activity,
  FileCheck2,
  UploadCloud,
  Settings,
  Download,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Menu,
  X,
  Scale
} from "lucide-react";
import { downloadFullBackup } from "@/lib/api";

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (pathname === "/login") {
    return null;
  }

  const handleBackupDownload = async () => {
    try {
      setDownloading(true);
      await downloadFullBackup();
    } catch (err: any) {
      alert("Failed to export backup: " + (err?.message || "Unknown error"));
    } finally {
      setDownloading(false);
    }
  };

  const navSections = [
    {
      heading: "ACCOUNTS",
      items: [
        { label: "Accounts", href: "/cases", icon: FolderLock },
        { label: "Activity", href: "/activity", icon: Activity },
        { label: "Settlements", href: "/settlements", icon: FileCheck2 },
      ],
    },
    {
      heading: "TOOLS",
      items: [
        { label: "Import", href: "/upload", icon: UploadCloud },
        { label: "Settings", href: "/settings", icon: Settings },
      ],
    },
  ];

  return (
    <>
      {/* Mobile top toggle */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50">
        <div className="flex items-center space-x-2">
          <Scale className="w-5 h-5 text-emerald-400" />
          <span className="font-bold text-base tracking-tight">Accrue</span>
          <span className="text-[10px] text-slate-400">by Strategic Debt Solutions</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800"
          aria-label="Toggle Navigation"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-xs"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Desktop & Mobile drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 bg-slate-950 text-slate-200 border-r border-slate-800 flex flex-col justify-between transition-all duration-300 ${
          collapsed ? "w-20" : "w-64"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Top Header / Branding */}
        <div>
          <div className="px-5 py-6 border-b border-slate-800/80 flex items-center justify-between">
            {!collapsed ? (
              <div>
                <Link href="/cases" className="group block">
                  <div className="flex items-center space-x-2">
                    <span className="font-black text-2xl tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                      Accrue
                    </span>
                    <span className="bg-emerald-500/20 text-emerald-400 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border border-emerald-500/30">
                      Recovery
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
                    by Strategic Debt Solutions Ltd
                  </span>
                </Link>
              </div>
            ) : (
              <div className="mx-auto">
                <Link href="/cases" className="font-black text-xl text-emerald-400">
                  A
                </Link>
              </div>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-6">
            {navSections.map((section) => (
              <div key={section.heading}>
                {!collapsed && (
                  <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    {section.heading}
                  </p>
                )}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      pathname === item.href ||
                      (item.href === "/cases" && (pathname === "/" || pathname.startsWith("/cases")));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        title={collapsed ? item.label : undefined}
                        className={`flex items-center ${
                          collapsed ? "justify-center px-2" : "px-3"
                        } py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-emerald-600 text-white font-semibold shadow-xs"
                            : "text-slate-300 hover:bg-slate-900 hover:text-white"
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"} ${collapsed ? "" : "mr-3"}`} />
                        {!collapsed && <span>{item.label}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom Sidebar: Creditor info, backup, signout & hide menu */}
        <div className="p-3 border-t border-slate-800/80 space-y-3">
          {/* Plaintiff Creditor Badge */}
          {!collapsed ? (
            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5">
              <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold uppercase tracking-wider text-[10px]">Creditor Institution</span>
              </div>
              <p className="text-xs font-bold text-slate-100 truncate">
                Universal Merchant Bank
              </p>
            </div>
          ) : (
            <div className="flex justify-center" title="Universal Merchant Bank">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
          )}

          {/* Backup Button */}
          <button
            onClick={handleBackupDownload}
            disabled={downloading}
            title="Download full database backup"
            className={`w-full flex items-center ${
              collapsed ? "justify-center px-2" : "px-3"
            } py-2 rounded-lg text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 hover:text-white border border-slate-800 transition-colors disabled:opacity-50`}
          >
            <Download className={`w-3.5 h-3.5 text-slate-400 ${collapsed ? "" : "mr-2.5"}`} />
            {!collapsed && (
              <span>{downloading ? "Exporting..." : "Download full backup"}</span>
            )}
          </button>

          {/* Admin Signout */}
          <Link
            href="/login"
            title="Admin signout"
            className={`flex items-center ${
              collapsed ? "justify-center px-2" : "px-3"
            } py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-900 hover:text-rose-400 transition-colors`}
          >
            <LogOut className={`w-3.5 h-3.5 ${collapsed ? "" : "mr-2.5"}`} />
            {!collapsed && <span>Admin signout</span>}
          </Link>

          {/* Hide Menu Collapse Button (Desktop Only) */}
          <div className="hidden lg:block pt-1">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="w-full flex items-center justify-center py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded transition-colors"
            >
              {collapsed ? (
                <div className="flex items-center space-x-1">
                  <ChevronRight className="w-4 h-4" />
                </div>
              ) : (
                <div className="flex items-center space-x-1.5">
                  <ChevronLeft className="w-4 h-4" />
                  <span>Hide menu</span>
                </div>
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
