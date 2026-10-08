"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  UploadCloud, 
  FileText, 
  Image as ImageIcon, 
  CheckCircle, 
  AlertCircle, 
  ArrowRight, 
  Loader2, 
  Scale, 
  ShieldCheck,
  Calendar,
  DollarSign,
  Percent,
  RefreshCw,
  Building
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { uploadDocument, createCase, ExtractedAgreementData } from "@/lib/api";

export default function UploadAndReviewPage() {
  const router = useRouter();

  // State
  const [step, setStep] = useState<"upload" | "review">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extracted and editable agreement state
  const [formData, setFormData] = useState<ExtractedAgreementData | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const validTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
        "image/png",
        "image/jpeg",
        "image/jpg",
        "text/plain"
      ];
      
      const ext = selected.name.split(".").pop()?.toLowerCase();
      const validExts = ["pdf", "docx", "doc", "png", "jpg", "jpeg", "txt"];

      if (!validExts.includes(ext || "")) {
        setError("Invalid file type. Please upload a PDF, DOCX, PNG, JPG, or TXT file.");
        return;
      }

      if (selected.size > 25 * 1024 * 1024) {
        setError("File size exceeds 25MB limit.");
        return;
      }

      setError(null);
      setFile(selected);
    }
  };

  const handleUploadAndExtract = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const extracted = await uploadDocument(file);
      setFormData(extracted);
      setStep("review");
    } catch (err: any) {
      setError(err.message || "Failed to process document");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFieldChange = (field: keyof ExtractedAgreementData, value: any) => {
    if (!formData) return;
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  // Recalculate instalment amount when original amount or count changes
  const handleAmountOrCountChange = (originalAmount: number, count: number) => {
    if (!formData) return;
    const safeCount = Math.max(1, count);
    const paymentAmt = Math.round((originalAmount / safeCount) * 100) / 100;
    setFormData({
      ...formData,
      original_amount: originalAmount,
      instalments_count: safeCount,
      payment_amount: paymentAmt,
    });
  };

  const handleConfirmAndCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    setIsCreating(true);
    setError(null);

    try {
      const createdCase = await createCase(formData);
      router.push(`/cases/${createdCase.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create case");
      setIsCreating(false);
    }
  };

  // Generate a live preview of schedule items
  const renderSchedulePreview = () => {
    if (!formData) return null;
    const items = [];
    const count = Math.max(1, formData.instalments_count);
    const baseAmt = Math.round((formData.original_amount / count) * 100) / 100;
    const totalBase = baseAmt * count;
    const diff = Math.round((formData.original_amount - totalBase) * 100) / 100;

    let dueDate = new Date(formData.start_date || new Date().toISOString().split("T")[0]);
    if (isNaN(dueDate.getTime())) {
      dueDate = new Date();
    }

    for (let i = 1; i <= count; i++) {
      let amt = baseAmt;
      if (i === count) {
        amt = Math.round((amt + diff) * 100) / 100;
      }

      const formattedDate = dueDate.toISOString().split("T")[0];
      items.push({
        num: i,
        due: formattedDate,
        amount: amt,
      });

      // advance date based on frequency
      if (formData.frequency === "weekly") {
        dueDate.setDate(dueDate.getDate() + 7);
      } else if (formData.frequency === "biweekly") {
        dueDate.setDate(dueDate.getDate() + 14);
      } else if (formData.frequency === "quarterly") {
        dueDate.setMonth(dueDate.getMonth() + 3);
      } else if (formData.frequency === "lump_sum") {
        // lump sum stays same date
      } else {
        dueDate.setMonth(dueDate.getMonth() + 1);
      }
    }

    return (
      <div className="border rounded-md overflow-hidden bg-card mt-4">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-20">Instalment</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right">Amount ({formData.currency})</TableHead>
              <TableHead>Initial Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((it) => (
              <TableRow key={it.num}>
                <TableCell className="font-semibold text-xs">#{it.num}</TableCell>
                <TableCell className="text-xs">{it.due}</TableCell>
                <TableCell className="text-right font-mono text-xs font-medium">
                  {formData.currency} {it.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[11px]">Upcoming</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Stepper Navigation */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-heading">
            {step === "upload" ? "Upload Court Order / Agreement" : "Review Extracted Terms"}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {step === "upload" 
              ? "Upload a PDF, DOCX, or scanned image to automatically extract payment terms." 
              : "Verify and adjust extracted terms before generating the enforceable payment schedule."}
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs font-medium">
          <span className={`px-2.5 py-1 rounded-full ${step === "upload" ? "bg-primary text-primary-foreground font-bold" : "bg-muted text-muted-foreground"}`}>
            1. Upload
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
          <span className={`px-2.5 py-1 rounded-full ${step === "review" ? "bg-primary text-primary-foreground font-bold" : "bg-muted text-muted-foreground"}`}>
            2. Review & Confirm
          </span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: Upload */}
      {step === "upload" && (
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle>Select Document</CardTitle>
            <CardDescription>
              Supported formats: PDF files, DOCX files, JPG images, PNG images (Max 25MB).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border-2 border-dashed rounded-xl p-8 text-center hover:border-primary/50 transition-colors bg-muted/10 relative">
              <input
                type="file"
                accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.txt"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isUploading}
              />
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <div>
                  <span className="font-semibold text-foreground text-sm">
                    Click to browse or drag and drop court order
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">
                    Consent Orders, Settlement Agreements, Default Judgments, Terms of Settlement
                  </p>
                </div>
              </div>
            </div>

            {file && (
              <div className="flex items-center justify-between p-4 bg-muted/30 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-md bg-background border">
                    {file.name.match(/\.(jpg|jpeg|png)$/i) ? (
                      <ImageIcon className="w-5 h-5 text-blue-500" />
                    ) : (
                      <FileText className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{file.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">Ready for extraction</Badge>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-4">
            <Button variant="ghost" onClick={() => router.push("/")}>
              Cancel
            </Button>
            <Button
              onClick={handleUploadAndExtract}
              disabled={!file || isUploading}
              className="gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Extracting Agreement Terms...</span>
                </>
              ) : (
                <>
                  <span>Extract Obligations</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* STEP 2: Review & Edit Information */}
      {step === "review" && formData && (
        <form onSubmit={handleConfirmAndCreate} className="space-y-6">
          {/* Fixed Plaintiff Banner */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-primary">
                  Fixed Plaintiff Configuration
                </div>
                <div className="text-sm font-semibold text-foreground mt-0.5">
                  Plaintiff Name: [PLAINTIFF NAME]
                </div>
                <div className="text-xs text-muted-foreground">
                  Address: [PLAINTIFF ADDRESS] • Contact: [PLAINTIFF CONTACT]
                </div>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] uppercase font-bold shrink-0">
              System Fixed
            </Badge>
          </div>

          {/* Case & Court Information */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">1. Case & Court Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="case_number">Case / Suit Number</Label>
                <Input
                  id="case_number"
                  value={formData.case_number}
                  onChange={(e) => handleFieldChange("case_number", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="court_name">Court / Tribunal</Label>
                <Input
                  id="court_name"
                  value={formData.court_name}
                  onChange={(e) => handleFieldChange("court_name", e.target.value)}
                  placeholder="e.g. High Court of Justice"
                />
              </div>
            </CardContent>
          </Card>

          {/* Defendant Information */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">2. Defendant Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="defendant_name">Defendant Full Name</Label>
                <Input
                  id="defendant_name"
                  value={formData.defendant_name}
                  onChange={(e) => handleFieldChange("defendant_name", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="defendant_address">Defendant Address</Label>
                <Input
                  id="defendant_address"
                  value={formData.defendant_address || ""}
                  onChange={(e) => handleFieldChange("defendant_address", e.target.value)}
                  placeholder="Residential or business address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="defendant_contact">Contact / Phone / Email</Label>
                <Input
                  id="defendant_contact"
                  value={formData.defendant_contact || ""}
                  onChange={(e) => handleFieldChange("defendant_contact", e.target.value)}
                  placeholder="+233 20 000 0000"
                />
              </div>
            </CardContent>
          </Card>

          {/* Financial Terms */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">3. Financial Terms & Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="original_amount">Original Debt Amount</Label>
                  <Input
                    id="original_amount"
                    type="number"
                    step="0.01"
                    value={formData.original_amount}
                    onChange={(e) =>
                      handleAmountOrCountChange(parseFloat(e.target.value) || 0, formData.instalments_count)
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={formData.currency}
                    onChange={(e) => handleFieldChange("currency", e.target.value.toUpperCase())}
                    placeholder="USD, GHS, GBP, EUR"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instalments_count">No. of Instalments</Label>
                  <Input
                    id="instalments_count"
                    type="number"
                    min="1"
                    max="120"
                    value={formData.instalments_count}
                    onChange={(e) =>
                      handleAmountOrCountChange(formData.original_amount, parseInt(e.target.value) || 1)
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="frequency">Payment Frequency</Label>
                  <select
                    id="frequency"
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                    value={formData.frequency}
                    onChange={(e) => handleFieldChange("frequency", e.target.value)}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="lump_sum">Lump Sum</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payment_amount">Amount Per Instalment</Label>
                  <Input
                    id="payment_amount"
                    type="number"
                    step="0.01"
                    value={formData.payment_amount}
                    onChange={(e) => handleFieldChange("payment_amount", parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="start_date">First Payment Due Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleFieldChange("start_date", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interest_rate">Interest Rate (% p.a.)</Label>
                  <Input
                    id="interest_rate"
                    type="number"
                    step="0.1"
                    value={formData.interest_rate}
                    onChange={(e) => handleFieldChange("interest_rate", parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="grace_period_days">Grace Period (Days)</Label>
                  <Input
                    id="grace_period_days"
                    type="number"
                    value={formData.grace_period_days}
                    onChange={(e) => handleFieldChange("grace_period_days", parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Default and Penalty Terms */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">4. Default Penalties & Multi-Currency Rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="penalty_type">Penalty Type</Label>
                  <select
                    id="penalty_type"
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                    value={formData.penalty_type}
                    onChange={(e) => handleFieldChange("penalty_type", e.target.value)}
                  >
                    <option value="none">No Penalty</option>
                    <option value="percentage">Percentage on Arrears (%)</option>
                    <option value="fixed_fee">Fixed Penalty Fee</option>
                    <option value="per_day">Per-Day Late Fee</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="penalty_rate_or_fixed">Penalty Value</Label>
                  <Input
                    id="penalty_rate_or_fixed"
                    type="number"
                    step="0.01"
                    value={formData.penalty_rate_or_fixed}
                    onChange={(e) =>
                      handleFieldChange("penalty_rate_or_fixed", parseFloat(e.target.value) || 0)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="exchange_rate">Exchange Rate (Audit)</Label>
                  <Input
                    id="exchange_rate"
                    type="number"
                    step="0.0001"
                    value={formData.exchange_rate || 1.0}
                    onChange={(e) => handleFieldChange("exchange_rate", parseFloat(e.target.value) || 1.0)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="default_conditions">Extracted Default Trigger Conditions</Label>
                <Input
                  id="default_conditions"
                  value={formData.default_conditions || ""}
                  onChange={(e) => handleFieldChange("default_conditions", e.target.value)}
                  placeholder="e.g. Failure to pay within 7 days of due date constitutes default"
                />
              </div>
            </CardContent>
          </Card>

          {/* Live Schedule Preview */}
          <Card className="shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold">Generated Payment Schedule Preview</CardTitle>
              <CardDescription>
                Calculated deterministically based on your verified terms.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderSchedulePreview()}
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setStep("upload")} disabled={isCreating}>
              Back to Upload
            </Button>
            <Button type="submit" disabled={isCreating} className="gap-2">
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Case & Schedule...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Confirm & Create Payment Schedule</span>
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
