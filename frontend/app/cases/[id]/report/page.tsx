"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, Scale, Building, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCase, CaseDetail } from "@/lib/api";

export default function CalculationReportPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const caseId = unwrappedParams.id;

  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCase() {
      try {
        const data = await getCase(caseId);
        setCaseData(data);
      } catch (err: any) {
        setError(err.message || "Failed to load case data");
      } finally {
        setLoading(false);
      }
    }
    fetchCase();
  }, [caseId]);

  if (loading) {
    return <div className="py-20 text-center text-sm text-muted-foreground">Generating Audit Report...</div>;
  }

  if (error || !caseData) {
    return <div className="py-20 text-center text-sm text-destructive">{error || "Case not found"}</div>;
  }

  const calc = caseData.latest_calculation;
  const agr = caseData.agreement;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Print / Navigation Toolbar */}
      <div className="flex items-center justify-between no-print border-b pb-4">
        <Link href={`/cases/${caseId}`} className={buttonVariants({ variant: "ghost", size: "sm", className: "gap-1.5 text-xs" })}>
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Case Details</span>
        </Link>
        <Button onClick={() => window.print()} size="sm" className="gap-1.5 text-xs">
          <Printer className="w-3.5 h-3.5" />
          <span>Print / Save as PDF</span>
        </Button>
      </div>

      {/* Official Legal Audit Document */}
      <div className="bg-card text-card-foreground border shadow-sm rounded-xl p-8 sm:p-12 space-y-8 print:border-none print:shadow-none print:p-0">
        {/* Document Header */}
        <div className="border-b pb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-primary">
              <Scale className="w-6 h-6" />
              <span className="font-bold tracking-tight text-xl">LEGAL DEBT & DEFAULT CALCULATION AUDIT</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Official Statement of Outstanding Debt Obligations
            </div>
            <div className="font-mono text-xs font-semibold text-foreground mt-1">
              Case Ref: {caseData.case_number}
            </div>
          </div>

          <div className="text-right space-y-1 text-xs">
            <div className="font-medium text-muted-foreground">Audit Generated On:</div>
            <div className="font-bold text-foreground">{calc?.calculation_date || new Date().toLocaleString()}</div>
            <Badge
              variant={caseData.status === "defaulted" ? "destructive" : "outline"}
              className="uppercase tracking-wider font-bold text-[10px]"
            >
              Status: {caseData.status}
            </Badge>
          </div>
        </div>

        {/* Parties Section */}
        <div className="grid grid-cols-2 gap-8 text-xs border-b pb-6">
          <div className="space-y-1">
            <div className="font-bold text-muted-foreground uppercase tracking-wider text-[11px]">
              Creditor / Plaintiff (Fixed)
            </div>
            <div className="font-bold text-sm text-foreground">{caseData.plaintiff_name}</div>
            <div className="text-muted-foreground">{caseData.plaintiff_address || "[PLAINTIFF ADDRESS]"}</div>
            <div className="text-muted-foreground">Contact: {caseData.plaintiff_contact || "[PLAINTIFF CONTACT]"}</div>
          </div>

          <div className="space-y-1">
            <div className="font-bold text-muted-foreground uppercase tracking-wider text-[11px]">
              Debtor / Defendant
            </div>
            <div className="font-bold text-sm text-foreground">{caseData.defendant_name}</div>
            <div className="text-muted-foreground">{caseData.defendant_address || "No address provided"}</div>
            <div className="text-muted-foreground">Contact: {caseData.defendant_contact || "N/A"}</div>
          </div>
        </div>

        {/* Agreement Baseline */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            1. Underlying Court Order / Agreement Baseline
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-muted/20 p-4 rounded-lg text-xs">
            <div>
              <div className="text-muted-foreground">Court/Tribunal:</div>
              <div className="font-semibold">{caseData.court_name || "High Court"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Order Date:</div>
              <div className="font-semibold">{agr?.start_date}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Agreed Interest:</div>
              <div className="font-semibold">{agr?.interest_rate}% p.a.</div>
            </div>
            <div>
              <div className="text-muted-foreground">Grace Period:</div>
              <div className="font-semibold">{agr?.grace_period_days} Days</div>
            </div>
          </div>
        </div>

        {/* The Calculation Breakdown Formula */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            2. Deterministic Calculation Breakdown
          </h2>
          
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead>Financial Component</TableHead>
                  <TableHead>Formula & Legal Term Applied</TableHead>
                  <TableHead className="text-right">Amount ({agr?.currency})</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                <TableRow>
                  <TableCell className="font-medium">Original Agreement Debt</TableCell>
                  <TableCell className="text-muted-foreground">Principal amount ordered by the Court</TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {agr?.currency} {(calc?.original_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell className="font-medium text-emerald-600">Less Payments Made</TableCell>
                  <TableCell className="text-muted-foreground">
                    Sum of {caseData.payments.length} verified payment receipt(s)
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium text-emerald-600">
                    - {agr?.currency} {(calc?.total_paid ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>

                <TableRow className="bg-muted/20 font-semibold">
                  <TableCell>Outstanding Principal</TableCell>
                  <TableCell className="text-muted-foreground">Original Debt minus Total Payments</TableCell>
                  <TableCell className="text-right font-mono font-bold">
                    {agr?.currency} {(calc?.outstanding_principal ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell className="font-medium text-amber-600">Plus Accrued Interest</TableCell>
                  <TableCell className="text-muted-foreground">
                    Accrued on unpaid principal at {agr?.interest_rate}% per annum
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium text-amber-600">
                    + {agr?.currency} {(calc?.accrued_interest ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell className="font-medium text-destructive">Plus Default Penalties</TableCell>
                  <TableCell className="text-muted-foreground">
                    {agr?.penalty_type === "percentage"
                      ? `${agr?.penalty_rate_or_fixed}% default penalty applied to arrears past grace period`
                      : `Fixed fee / daily penalty of ${agr?.penalty_rate_or_fixed}`}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium text-destructive">
                    + {agr?.currency} {(calc?.default_interest_or_penalty ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>

                {calc?.target_currency && calc.target_currency !== agr?.currency && (
                  <TableRow>
                    <TableCell className="font-medium">Currency Conversion</TableCell>
                    <TableCell className="text-muted-foreground">
                      Applied agreed exchange rate: 1 {agr?.currency} = {calc.exchange_rate.toFixed(4)} {calc.target_currency}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      Rate: {calc.exchange_rate.toFixed(4)}
                    </TableCell>
                  </TableRow>
                )}

                <TableRow className="bg-primary/10 font-bold text-sm border-t-2">
                  <TableCell className="py-4 text-primary">CURRENT TOTAL AMOUNT OWED</TableCell>
                  <TableCell className="py-4 text-xs text-muted-foreground">
                    Enforceable balance as of audit date
                  </TableCell>
                  <TableCell className="py-4 text-right font-mono text-base font-black text-primary">
                    {calc?.target_currency || agr?.currency} {(calc?.total_amount_owed ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Chronological Step-by-Step Mathematical Trace */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            3. Deterministic Mathematical Trace
          </h2>
          <div className="bg-muted/40 p-4 rounded-lg font-mono text-[11px] space-y-1.5 border">
            {calc?.step_by_step_log.map((log, index) => (
              <div key={index} className="flex gap-2">
                <span className="text-muted-foreground select-none">[{index + 1}]</span>
                <span className={index === calc.step_by_step_log.length - 1 ? "font-bold text-foreground" : "text-muted-foreground"}>
                  {log}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Default Gains & Losses Analysis */}
        {caseData.gains_and_losses && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>4. Default Gains &amp; Losses Analysis (Creditor vs. Debtor Financial Impact)</span>
              <Badge variant={caseData.gains_and_losses.has_defaulted ? "destructive" : "outline"} className="text-[10px]">
                {caseData.gains_and_losses.has_defaulted
                  ? `${caseData.gains_and_losses.defaulted_periods_count} Period(s) in Default`
                  : "No Default Detected"}
              </Badge>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-muted/20 p-4 rounded-lg text-xs">
              <div>
                <div className="text-muted-foreground">Expected by Scheduled Terms:</div>
                <div className="font-semibold">{agr?.currency} {caseData.gains_and_losses.total_expected_to_date.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Actual Received:</div>
                <div className="font-semibold text-emerald-600">{agr?.currency} {caseData.gains_and_losses.total_paid_to_date.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Creditor Cash Flow Shortfall:</div>
                <div className="font-semibold text-amber-600">{agr?.currency} {caseData.gains_and_losses.cash_flow_shortfall.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Default Penalties &amp; Interest:</div>
                <div className="font-semibold text-destructive">{agr?.currency} {(caseData.gains_and_losses.total_default_penalties + caseData.gains_and_losses.total_accrued_interest).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              </div>
            </div>

            {caseData.gains_and_losses.periods.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead>Instalment</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Scheduled</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Creditor Shortfall</TableHead>
                      <TableHead className="text-right">Penalties / Default Int.</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    {caseData.gains_and_losses.periods.map((p) => (
                      <TableRow key={p.instalment_number} className={p.is_defaulted ? "bg-destructive/5" : ""}>
                        <TableCell className="font-medium">#{p.instalment_number}</TableCell>
                        <TableCell>{p.due_date}</TableCell>
                        <TableCell className="text-right font-mono">{agr?.currency} {p.amount_due.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right font-mono text-emerald-600">{agr?.currency} {p.amount_paid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right font-mono text-amber-600">
                          {p.shortfall > 0 ? `${agr?.currency} ${p.shortfall.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-destructive">
                          {(p.period_penalty + p.period_interest) > 0
                            ? `+ ${agr?.currency} ${(p.period_penalty + p.period_interest).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={p.is_defaulted ? "destructive" : p.days_overdue > 0 ? "secondary" : "outline"} className="text-[10px]">
                            {p.is_defaulted ? `Default (${p.days_overdue}d)` : p.days_overdue > 0 ? "Overdue" : "Paid / Pending"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        {/* Certification Signoff */}
        <div className="border-t pt-8 grid grid-cols-2 gap-8 text-xs text-muted-foreground">
          <div className="space-y-8">
            <div>
              <p className="font-medium text-foreground">Prepared on behalf of Creditor:</p>
              <p>{caseData.plaintiff_name}</p>
            </div>
            <div className="border-t border-dashed w-48 pt-1 text-[10px]">
              Authorized Officer Signature
            </div>
          </div>

          <div className="space-y-8 text-right">
            <div>
              <p className="font-medium text-foreground">Calculation Engine Certification:</p>
              <p>Deterministic Engine v1.0.0 (Verified)</p>
            </div>
            <div className="border-t border-dashed w-48 ml-auto pt-1 text-[10px]">
              System Audit Stamp
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
