"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  FolderLock, 
  PlusCircle, 
  Scale, 
  Eye, 
  Search, 
  AlertTriangle, 
  ArrowRight,
  User,
  TrendingDown,
  Building,
  UserPlus
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCases, CaseDetail } from "@/lib/api";

export default function CasesListPage() {
  const [cases, setCases] = useState<CaseDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "defaulted" | "overdue" | "active" | "settled">("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCases() {
      try {
        const data = await getCases();
        setCases(data);
      } catch (err: any) {
        setError(err.message || "Failed to load defendant accounts");
      } finally {
        setLoading(false);
      }
    }
    loadCases();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "defaulted":
        return <Badge variant="destructive" className="capitalize font-bold">Defaulted</Badge>;
      case "overdue":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 capitalize font-bold">Overdue</Badge>;
      case "settled":
        return <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 capitalize font-bold">Settled</Badge>;
      default:
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 capitalize font-medium">Active</Badge>;
    }
  };

  const filteredCases = cases.filter((c) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      c.defendant_name.toLowerCase().includes(term) ||
      c.case_number.toLowerCase().includes(term) ||
      (c.court_name && c.court_name.toLowerCase().includes(term));

    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-heading text-foreground">
            Defendant Accounts & Settlement Agreements
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Search defendant accounts, review agreed payment terms, track defaults, and calculate gains/losses.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/upload" className={buttonVariants({ className: "gap-2 font-bold shadow-xs" })}>
            <PlusCircle className="w-4 h-4" />
            <span>New Agreement / Account</span>
          </Link>
        </div>
      </div>

      <Card className="shadow-xs">
        <CardHeader className="pb-3 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold">Accounts Registry</CardTitle>
              <CardDescription className="text-xs">
                {filteredCases.length} account{filteredCases.length === 1 ? "" : "s"} found
              </CardDescription>
            </div>

            {/* Fast search by Defendant Name */}
            <div className="w-full sm:w-80 relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Type defendant name or account ref..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
          </div>

          {/* Status Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {(
              [
                { id: "all", label: "All Accounts" },
                { id: "defaulted", label: "Defaulted" },
                { id: "overdue", label: "Overdue" },
                { id: "active", label: "Active" },
                { id: "settled", label: "Settled" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  statusFilter === tab.id
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Loading accounts directory...
            </div>
          ) : error ? (
            <div className="py-16 text-center text-sm text-destructive">{error}</div>
          ) : filteredCases.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <User className="w-10 h-10 mx-auto text-muted-foreground/50" />
              <div className="space-y-1">
                <div className="text-sm font-semibold">
                  {searchTerm ? `No account found matching "${searchTerm}"` : "No accounts registered yet"}
                </div>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {searchTerm 
                    ? "You can quickly open a new account for this defendant and set up their agreement terms."
                    : "Upload an agreement document or enter settlement terms directly to create a defendant account."}
                </p>
              </div>
              <div>
                <Link
                  href={searchTerm ? `/upload` : "/upload"}
                  className={buttonVariants({ size: "sm", className: "gap-1.5 font-bold" })}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{searchTerm ? `Create Account for "${searchTerm}"` : "Open First Defendant Account"}</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Defendant (Debtor)</TableHead>
                    <TableHead>Account Ref</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Agreed Debt</TableHead>
                    <TableHead className="text-right">Total Recovered</TableHead>
                    <TableHead className="text-right">Current Claim Owed</TableHead>
                    <TableHead className="text-right">Default Penalties / Gains</TableHead>
                    <TableHead className="w-24 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCases.map((c) => {
                    const agr = c.agreement;
                    const calc = c.latest_calculation;
                    const gnl = c.gains_and_losses;
                    const penaltiesAndInterest = gnl ? gnl.total_creditor_gains : ((calc?.accrued_interest || 0) + (calc?.default_interest_or_penalty || 0));

                    return (
                      <TableRow key={c.id} className="hover:bg-muted/40 transition-colors">
                        <TableCell>
                          <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span>{c.defendant_name}</span>
                          </div>
                          {c.defendant_contact && (
                            <div className="text-xs text-muted-foreground mt-0.5">{c.defendant_contact}</div>
                          )}
                        </TableCell>

                        <TableCell>
                          <span className="font-mono text-xs font-semibold text-primary">{c.case_number}</span>
                          <div className="text-[11px] text-muted-foreground">{c.court_name || "Settlement Agreement"}</div>
                        </TableCell>

                        <TableCell>{getStatusBadge(c.status)}</TableCell>

                        <TableCell className="text-right font-mono text-xs font-medium">
                          {agr?.currency} {(agr?.original_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>

                        <TableCell className="text-right font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {agr?.currency} {(calc?.total_paid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>

                        <TableCell className="text-right font-mono text-xs font-black text-foreground">
                          {agr?.currency} {(calc?.total_amount_owed || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>

                        <TableCell className="text-right font-mono text-xs">
                          {penaltiesAndInterest > 0 ? (
                            <span className="font-bold text-destructive">
                              +{agr?.currency} {penaltiesAndInterest.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        <TableCell className="text-right">
                          <Link
                            href={`/cases/${c.id}`}
                            className={buttonVariants({ variant: "outline", size: "sm", className: "h-8 px-2.5 text-xs font-semibold gap-1" })}
                          >
                            <Eye className="w-3 h-3" />
                            <span>View</span>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
