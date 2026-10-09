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
  Building,
  User,
  PenTool,
  Sparkles,
  Info
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { uploadDocument, createCase, ExtractedAgreementData } from "@/lib/api";

export default function UploadAndReviewPage() {
  const router = useRouter();

  // State
  const [step, setStep] = useState<"upload" | "review">("upload");
  const [entryMode, setEntryMode] = useState<"file" | "manual">("file");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extracted and editable agreement state
  const [formData, setFormData] = useState<ExtractedAgreementData>({
    case_number: "",
    court_name: "",
    defendant_name: "",
    defendant_address: "",
    defendant_contact: "",
    original_amount: 10000,
    currency: "USD",
    payment_amount: 1000,
    frequency: "monthly",
    start_date: new Date().toISOString().split("T")[0],
    instalments_count: 10,
    interest_rate: 0,
    penalty_rate_or_fixed: 5,
    penalty_type: "percentage",
    grace_period_days: 7,
    default_conditions: "In the event of default on any instalment exceeding the grace period, penalty applies on overdue balance.",
    exchange_rate: 1.0,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
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
      setFormData({
        ...extracted,
        start_date: extracted.start_date || new Date().toISOString().split("T")[0],
        instalments_count: extracted.instalments_count || 1,
        frequency: extracted.frequency || "monthly",
        currency: extracted.currency || "USD",
        penalty_type: extracted.penalty_type || "percentage",
      });
      setStep("review");
    } catch (err: any) {
      setError(err.message || "Failed to process document");
    } finally {
      setIsUploading(false);
    }
  };

  const handleStartManualEntry = () => {
    setError(null);
    setStep("review");
  };

  const handleFieldChange = (field: keyof ExtractedAgreementData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Recalculate instalment amount when original amount or count changes
  const handleAmountOrCountChange = (originalAmount: number, count: number) => {
    const safeCount = Math.max(1, count);
    const paymentAmt = Math.round((originalAmount / safeCount) * 100) / 100;
    setFormData((prev) => ({
      ...prev,
      original_amount: originalAmount,
      instalments_count: safeCount,
      payment_amount: paymentAmt,
    }));
  };

  const handleConfirmAndCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.defendant_name.trim()) {
      setError("Please type the defendant name to create their account.");
      return;
    }
    if (formData.original_amount <= 0) {
      setError("Original agreement amount must be greater than zero.");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const createdCase = await createCase(formData);
      router.push(`/cases/${createdCase.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create defendant account and agreement");
      setIsCreating(false);
    }
  };

  // Generate a live preview of schedule items
  const renderSchedulePreview = () => {
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
        // lump sum stays same
      } else {
        dueDate.setMonth(dueDate.getMonth() + 1);
      }
    }

    return (
      <div className="border rounded-md overflow-hidden bg-card mt-3">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right">Agreed Due ({formData.currency})</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.slice(0, 12).map((it) => (
              <TableRow key={it.num}>
                <TableCell className="font-semibold text-xs">Instalment #{it.num}</TableCell>
                <TableCell className="text-xs font-mono">{it.due}</TableCell>
                <TableCell className="text-right font-mono text-xs font-bold text-foreground">
                  {formData.currency} {it.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px]">Upcoming</Badge>
                </TableCell>
              </TableRow>
            ))}
            {items.length > 12 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-xs text-muted-foreground italic py-2">
                  + {items.length - 12} more instalments will be generated...
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Stepper Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-heading">
            {step === "upload" ? "Upload Agreement Terms & Open Account" : "Configure Defendant Account & Terms"}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {step === "upload" 
              ? "Upload the terms of settlement / agreement document or enter the terms directly." 
              : "Review terms, assign defendant name, and open their monitored debt account."}
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs font-medium">
          <span className={`px-3 py-1 rounded-full ${step === "upload" ? "bg-primary text-primary-foreground font-bold" : "bg-muted text-muted-foreground"}`}>
            1. Terms Input
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
          <span className={`px-3 py-1 rounded-full ${step === "review" ? "bg-primary text-primary-foreground font-bold" : "bg-muted text-muted-foreground"}`}>
            2. Defendant Account & Review
          </span>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold block">Notice</span>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* STEP 1: Upload or Direct Entry */}
      {step === "upload" && (
        <div className="space-y-4">
          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setEntryMode("file")}
              className={`p-4 rounded-xl border text-left transition-all ${
                entryMode === "file"
                  ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                  : "border-border bg-card hover:bg-muted/50 text-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold text-sm text-foreground mb-1">
                <UploadCloud className="w-4 h-4 text-primary" />
                <span>Upload Terms Document</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Upload terms of settlement or consent agreement (DOCX, PDF, image) to extract automatically.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setEntryMode("manual")}
              className={`p-4 rounded-xl border text-left transition-all ${
                entryMode === "manual"
                  ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                  : "border-border bg-card hover:bg-muted/50 text-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold text-sm text-foreground mb-1">
                <PenTool className="w-4 h-4 text-primary" />
                <span>Enter Terms Directly</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Type the defendant's name and terms of agreement without uploading a file.
              </p>
            </button>
          </div>

          {entryMode === "file" ? (
            <Card className="shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-bold">Select Agreement Terms Document</CardTitle>
                <CardDescription className="text-xs">
                  Supported formats: DOCX files, PDF files, JPG images, PNG images (Max 25MB).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="border-2 border-dashed rounded-xl p-8 text-center hover:border-primary/50 transition-colors bg-muted/10 relative">
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.txt"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isUploading}
                  />
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="font-semibold text-foreground text-sm">
                        Click to browse or drag and drop agreement terms
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">
                        Terms of Settlement, Consent Agreements, Payment Orders
                      </p>
                    </div>
                  </div>
                </div>

                {file && (
                  <div className="flex items-center justify-between p-3.5 bg-muted/30 border rounded-lg">
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
                <Button variant="ghost" size="sm" onClick={() => router.push("/cases")}>
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
                      <span>Extract Terms & Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Card className="shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-bold">Direct Agreement Entry</CardTitle>
                <CardDescription className="text-xs">
                  Create a defendant account and define the agreed payment schedule directly.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 flex items-start gap-3">
                  <User className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Open Defendant Account</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      You will configure the defendant's details, agreed total amount, instalment schedule, and default penalties in the next step.
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-4">
                <Button variant="ghost" size="sm" onClick={() => router.push("/cases")}>
                  Cancel
                </Button>
                <Button onClick={handleStartManualEntry} className="gap-2">
                  <span>Proceed to Enter Terms</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      )}

      {/* STEP 2: Review & Configure Account */}
      {step === "review" && (
        <form onSubmit={handleConfirmAndCreate} className="space-y-6">
          {/* Defendant Account Identification */}
          <Card className="shadow-xs border-primary/30 bg-primary/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">1. Defendant Account</CardTitle>
                    <CardDescription className="text-xs">
                      Type the defendant name to create their account and link the agreement.
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold">
                  Required Account
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5 md:col-span-1">
                <Label htmlFor="defendant_name" className="text-xs font-semibold">
                  Defendant / Debtor Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="defendant_name"
                  placeholder="e.g. Ghana Alu Limited"
                  value={formData.defendant_name}
                  onChange={(e) => handleFieldChange("defendant_name", e.target.value)}
                  className="font-semibold text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="defendant_contact" className="text-xs font-semibold">
                  Contact / Phone / Email
                </Label>
                <Input
                  id="defendant_contact"
                  placeholder="e.g. +233 24 123 4567"
                  value={formData.defendant_contact || ""}
                  onChange={(e) => handleFieldChange("defendant_contact", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="defendant_address" className="text-xs font-semibold">
                  Business / Residential Address
                </Label>
                <Input
                  id="defendant_address"
                  placeholder="e.g. Plot 10, Spintex Road, Accra"
                  value={formData.defendant_address || ""}
                  onChange={(e) => handleFieldChange("defendant_address", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Terms of Agreement */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">2. Terms of Agreement</CardTitle>
                  <CardDescription className="text-xs">
                    Specify the payment amounts, frequency, grace period, and default rules.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs">
                  Modifiable anytime
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Row 1: Amounts & Frequency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="original_amount" className="text-xs font-semibold">
                    Total Agreed Obligation <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="original_amount"
                    type="number"
                    step="0.01"
                    value={formData.original_amount}
                    onChange={(e) =>
                      handleAmountOrCountChange(parseFloat(e.target.value) || 0, formData.instalments_count)
                    }
                    className="font-bold text-sm"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="currency" className="text-xs font-semibold">
                    Currency <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="currency"
                    value={formData.currency}
                    onChange={(e) => handleFieldChange("currency", e.target.value.toUpperCase())}
                    placeholder="USD, GHS, GBP, EUR"
                    className="font-mono uppercase font-bold"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="instalments_count" className="text-xs font-semibold">
                    No. of Instalments <span className="text-destructive">*</span>
                  </Label>
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

                <div className="space-y-1.5">
                  <Label htmlFor="frequency" className="text-xs font-semibold">
                    Payment Frequency
                  </Label>
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

              {/* Row 2: Instalment amount & dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="payment_amount" className="text-xs font-semibold">
                    Amount Per Instalment
                  </Label>
                  <Input
                    id="payment_amount"
                    type="number"
                    step="0.01"
                    value={formData.payment_amount}
                    onChange={(e) => handleFieldChange("payment_amount", parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="start_date" className="text-xs font-semibold">
                    First Due Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleFieldChange("start_date", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="grace_period_days" className="text-xs font-semibold">
                    Grace Period (Days)
                  </Label>
                  <Input
                    id="grace_period_days"
                    type="number"
                    min="0"
                    max="60"
                    value={formData.grace_period_days}
                    onChange={(e) => handleFieldChange("grace_period_days", parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="interest_rate" className="text-xs font-semibold">
                    Interest Rate (% p.a.)
                  </Label>
                  <Input
                    id="interest_rate"
                    type="number"
                    step="0.1"
                    value={formData.interest_rate}
                    onChange={(e) => handleFieldChange("interest_rate", parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              {/* Row 3: Penalty Terms & Conditions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="penalty_type" className="text-xs font-semibold">
                    Default Penalty Type
                  </Label>
                  <select
                    id="penalty_type"
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                    value={formData.penalty_type}
                    onChange={(e) => handleFieldChange("penalty_type", e.target.value)}
                  >
                    <option value="percentage">Percentage on Arrears (%)</option>
                    <option value="per_day">Per-Day Penalty Amount</option>
                    <option value="fixed_fee">Fixed Penalty Fee</option>
                    <option value="none">No Penalty Clause</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="penalty_rate_or_fixed" className="text-xs font-semibold">
                    Penalty Value ({formData.penalty_type === "percentage" ? "%" : formData.currency})
                  </Label>
                  <Input
                    id="penalty_rate_or_fixed"
                    type="number"
                    step="0.1"
                    value={formData.penalty_rate_or_fixed}
                    onChange={(e) => handleFieldChange("penalty_rate_or_fixed", parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="case_number" className="text-xs font-semibold flex items-center justify-between">
                    <span>Agreement / Suit Ref</span>
                    <span className="text-muted-foreground font-normal text-[11px]">(Optional)</span>
                  </Label>
                  <Input
                    id="case_number"
                    placeholder="Auto-generated if empty"
                    value={formData.case_number}
                    onChange={(e) => handleFieldChange("case_number", e.target.value)}
                  />
                </div>
              </div>

              {/* Default Conditions */}
              <div className="space-y-1.5 pt-2">
                <Label htmlFor="default_conditions" className="text-xs font-semibold">
                  Default Clause / Conditions
                </Label>
                <Input
                  id="default_conditions"
                  placeholder="e.g. In the event of default on any instalment exceeding 7 days, entire sum becomes immediately due."
                  value={formData.default_conditions || ""}
                  onChange={(e) => handleFieldChange("default_conditions", e.target.value)}
                />
              </div>

              {/* Schedule Preview */}
              <div className="pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground">Generated Instalment Schedule Preview</Label>
                  <span className="text-xs text-muted-foreground">{formData.instalments_count} instalments • {formData.frequency}</span>
                </div>
                {renderSchedulePreview()}
              </div>
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex items-center justify-between border-t pt-4">
            <Button type="button" variant="outline" size="sm" onClick={() => setStep("upload")}>
              Back to Input
            </Button>
            <Button type="submit" size="default" disabled={isCreating} className="gap-2 font-bold shadow-sm">
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Opening Account...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Create Defendant Account & Enforce Terms</span>
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
