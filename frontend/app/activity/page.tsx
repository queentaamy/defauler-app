"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Activity as ActivityIcon, 
  ArrowRight, 
  CreditCard, 
  AlertTriangle, 
  FileCheck2, 
  Clock, 
  Calendar,
  Building2
} from "lucide-react";
import { getCases, CaseDetail } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ActivityItem {
  id: string;
  type: "payment" | "breach" | "creation";
  title: string;
  description: string;
  amount?: number;
  currency?: string;
  date: string;
  caseId: string;
  defendantName: string;
}

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadActivity() {
      try {
        setLoading(true);
        const cases = await getCases(undefined, true);
        const items: ActivityItem[] = [];

        for (const c of cases) {
          // Account creation activity
          items.push({
            id: `create-${c.id}`,
            type: "creation",
            title: `Account opened: ${c.defendant_name}`,
            description: `${c.account_type === "settlement" ? "Settlement contract" : "Court judgment debt"} registered for ${c.currency} ${(c.settlement_total || 0).toLocaleString()}`,
            date: c.created_at || new Date().toISOString(),
            caseId: c.id,
            defendantName: c.defendant_name,
          });

          // Breach activity if breached
          if (c.is_breached) {
            items.push({
              id: `breach-${c.id}`,
              type: "breach",
              title: `Settlement breached: ${c.defendant_name}`,
              description: `Milestone missed. Full debt reinstated at ${c.currency} ${(c.reinstatement_amount || 0).toLocaleString()} @ ${c.reinstatement_interest_rate || 12}% p.a.`,
              date: c.breached_date || c.created_at,
              caseId: c.id,
              defendantName: c.defendant_name,
            });
          }

          // Payment activities
          if (c.payments && c.payments.length > 0) {
            for (const p of c.payments) {
              items.push({
                id: `payment-${p.id}`,
                type: "payment",
                title: `Payment received from ${c.defendant_name}`,
                description: `Ref: ${p.payment_reference || "Direct receipt"}${p.notes ? ` - ${p.notes}` : ""}`,
                amount: p.amount,
                currency: p.currency || c.currency,
                date: p.payment_date || p.created_at,
                caseId: c.id,
                defendantName: c.defendant_name,
              });
            }
          }
        }

        // Sort descending by date
        items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setActivities(items);
      } catch (err: any) {
        setError(err?.message || "Failed to load activity feed.");
      } finally {
        setLoading(false);
      }
    }

    loadActivity();
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Activity Audit Feed
          </h1>
          <Badge variant="outline" className="text-xs font-semibold">
            Real-time
          </Badge>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Chronological audit trail of debt recovery events, logged receipts, and automated breach evaluations.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => window.location.reload()} className="h-7 text-xs">
            Retry Connection
          </Button>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            Loading activity log...
          </div>
        ) : activities.length === 0 ? (
          <div className="p-12 text-center">
            <ActivityIcon className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
              No activity logged yet
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              As you register accounts, record receipts, and evaluate milestones, the complete audit feed will populate here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {activities.map((item) => (
              <div
                key={item.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-start space-x-3.5">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      item.type === "payment"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        : item.type === "breach"
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                    }`}
                  >
                    {item.type === "payment" ? (
                      <CreditCard className="w-4 h-4" />
                    ) : item.type === "breach" ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      <FileCheck2 className="w-4 h-4" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {item.title}
                      </h3>
                      {item.amount !== undefined && (
                        <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                          +{item.currency} {item.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                    <div className="flex items-center space-x-2 mt-2 text-[11px] text-slate-400">
                      <Calendar className="w-3 h-3" />
                      <span>{item.date}</span>
                    </div>
                  </div>
                </div>

                <div className="flex sm:justify-end">
                  <Link
                    href={`/cases/${item.caseId}`}
                    className="inline-flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    <span>View Account</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
