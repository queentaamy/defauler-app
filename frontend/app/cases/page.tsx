"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FolderLock, PlusCircle, Scale, Eye, Search, AlertTriangle, ArrowRight } from "lucide-react";
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCases() {
      try {
        const data = await getCases();
        setCases(data);
      } catch (err: any) {
        setError(err.message || "Failed to load cases");
      } finally {
        setLoading(false);
      }
    }
    loadCases();
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

  const filteredCases = cases.filter(
    (c) =>
      c.case_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.defendant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.court_name && c.court_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-heading">
            Court Orders & Case Files
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Directory of all monitored payment plans, court judgments, and settlement agreements.
          </p>
        </div>
        <Link href="/upload" className={buttonVariants({ className: "gap-2" })}>
          <PlusCircle className="w-4 h-4" />
          <span>New Court Order</span>
        </Link>
      </div>

      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold">Case Registry</CardTitle>
              <CardDescription>
                {filteredCases.length} total registered cases
              </CardDescription>
            </div>
            <div className="w-full sm:w-72 relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search case # or defendant..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Loading cases directory...
            </div>
          ) : error ? (
            <div className="py-12 text-center text-sm text-destructive">{error}</div>
          ) : filteredCases.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <FolderLock className="w-10 h-10 mx-auto text-muted-foreground/60" />
              <div className="text-sm font-medium">No matching cases found</div>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Upload a court order or agreement to create a monitored payment plan.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Case Number</TableHead>
                    <TableHead>Defendant</TableHead>
                    <TableHead>Court / Tribunal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Original Debt</TableHead>
                    <TableHead className="text-right">Current Owed</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCases.map((c) => {
                    const original = c.agreement?.original_amount ?? 0;
                    const curr = c.agreement?.currency ?? "USD";
                    const owed = c.latest_calculation?.total_amount_owed ?? original;

                    return (
                      <TableRow key={c.id} className="hover:bg-muted/40">
                        <TableCell className="font-mono text-xs font-semibold">
                          <Link href={`/cases/${c.id}`} className="hover:underline text-primary">
                            {c.case_number}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">{c.defendant_name}</div>
                          {c.defendant_contact && (
                            <div className="text-[11px] text-muted-foreground">
                              {c.defendant_contact}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {c.court_name || "—"}
                        </TableCell>
                        <TableCell>{getStatusBadge(c.status)}</TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {curr} {original.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold text-foreground">
                          {curr} {owed.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/cases/${c.id}`} className={buttonVariants({ variant: "outline", size: "sm", className: "h-8 gap-1.5 text-xs" })}>
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Case</span>
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
