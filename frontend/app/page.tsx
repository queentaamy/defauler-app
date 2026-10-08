"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Scale, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  DollarSign, 
  UploadCloud, 
  ArrowRight, 
  TrendingUp, 
  FileText, 
  Building 
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDashboardStats, DashboardStats } from "@/lib/api";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const data = await getDashboardStats();
        setStats(data);
      } catch (err: any) {
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "defaulted":
        return <Badge variant="destructive" className="capitalize">Defaulted</Badge>;
      case "overdue":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 capitalize">Overdue</Badge>;
      case "settled":
        return <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 capitalize">Settled</Badge>;
      default:
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 capitalize">Active</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight font-heading">
            Court Orders & Payment Dashboard
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Monitor court-mandated debt obligations, detect defaulters, and track outstanding balances.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/upload" className={buttonVariants({ size: "lg", className: "shadow-sm gap-2" })}>
            <UploadCloud className="w-4 h-4" />
            <span>Upload Court Order</span>
          </Link>
        </div>
      </div>

      {/* Metrics Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="shadow-xs hover:shadow-sm transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Total Cases
            </CardTitle>
            <Scale className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats?.total_cases ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Recorded agreements</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs hover:shadow-sm transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Active Plans
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {loading ? "..." : stats?.active_plans ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Paying on schedule</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs hover:shadow-sm transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Overdue Payments
            </CardTitle>
            <Clock className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {loading ? "..." : stats?.overdue_payments ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Within grace period</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs hover:shadow-sm transition-shadow border-destructive/20 bg-destructive/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-destructive uppercase">
              Defaulted Cases
            </CardTitle>
            <AlertTriangle className="w-4 h-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {loading ? "..." : stats?.defaulted_cases ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Subject to penalties</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs hover:shadow-sm transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Total Outstanding
            </CardTitle>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {loading
                ? "..."
                : `$${(stats?.total_outstanding_amount ?? 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Principal + Interest + Penalties</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cases Table */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">Active & Monitored Cases</CardTitle>
                <CardDescription>Recent court orders and settlement payment agreements</CardDescription>
              </div>
              <Link href="/cases" className={buttonVariants({ variant: "ghost", size: "sm", className: "gap-1 text-xs" })}>
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Loading cases...</div>
              ) : error ? (
                <div className="py-8 text-center text-sm text-destructive">{error}</div>
              ) : !stats?.recent_cases?.length ? (
                <div className="py-12 text-center space-y-3">
                  <FileText className="w-10 h-10 mx-auto text-muted-foreground/60" />
                  <div className="text-sm font-medium">No cases found</div>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Upload your first court order or payment agreement to start tracking.
                  </p>
                  <Link href="/upload" className={buttonVariants({ size: "sm", variant: "outline" })}>
                    Upload Document
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Case #</TableHead>
                        <TableHead>Defendant</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Original Amount</TableHead>
                        <TableHead className="text-right">Current Owed</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.recent_cases.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-mono text-xs font-semibold">
                            {c.case_number}
                          </TableCell>
                          <TableCell className="font-medium">{c.defendant_name}</TableCell>
                          <TableCell>{getStatusBadge(c.status)}</TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {c.currency} {c.original_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold text-foreground">
                            {c.currency} {c.current_owed.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/cases/${c.id}`} className={buttonVariants({ variant: "ghost", size: "sm", className: "h-8 px-2 text-xs" })}>
                              View Details
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Information Card */}
        <div className="space-y-6">
          <Card className="shadow-xs bg-muted/20 border-dashed">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2 text-primary">
                <Building className="w-5 h-5" />
                <CardTitle className="text-base font-bold">Fixed Plaintiff Information</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Automatically attached to all court orders and agreements.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div>
                <span className="text-muted-foreground block font-medium">Plaintiff Entity:</span>
                <span className="font-semibold text-foreground">[PLAINTIFF NAME]</span>
              </div>
              <div>
                <span className="text-muted-foreground block font-medium">Registered Address:</span>
                <span className="text-foreground">[PLAINTIFF ADDRESS]</span>
              </div>
              <div>
                <span className="text-muted-foreground block font-medium">Official Contact:</span>
                <span className="text-foreground">[PLAINTIFF CONTACT]</span>
              </div>
              <p className="text-[11px] text-muted-foreground pt-2 border-t">
                Configured centrally in the system configuration to prevent tampering.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">Deterministic Calculation Engine</CardTitle>
              <CardDescription className="text-xs">
                How balances and penalties are computed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <p><strong className="text-foreground">AI Separation:</strong> AI extracts obligations; backend engine strictly evaluates math.</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <p><strong className="text-foreground">Grace Periods:</strong> Overdue status activates after due date; default triggers after grace days.</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <p><strong className="text-foreground">Audit Trail:</strong> Every payment and recalculation generates an immutable mathematical breakdown.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
