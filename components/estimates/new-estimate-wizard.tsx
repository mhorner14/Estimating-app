"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Sparkles,
  MessageSquare,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  CheckCircle,
  User,
  PlusCircle,
} from "lucide-react";
import type { Customer, Service } from "@prisma/client";
import { useToast } from "@/hooks/use-toast";

type Step = "customer" | "intake" | "clarification" | "review";

interface AIResult {
  parsedData: Record<string, unknown>;
  clarificationQuestions: string[];
  suggestions: string[];
  warnings: string[];
  upsells: string[];
  isComplete: boolean;
}

interface Props {
  customers: Customer[];
  services: Service[];
}

export function NewEstimateWizard({ customers, services }: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("customer");
  const [loading, setLoading] = useState(false);

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [newCustomer, setNewCustomer] = useState({ name: "", email: "", phone: "", projectAddress: "" });
  const [isNewCustomer, setIsNewCustomer] = useState(false);

  const [aiInput, setAiInput] = useState("");
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [clarificationAnswers, setClarificationAnswers] = useState<Record<string, string>>({});

  async function handleAiParse() {
    if (!aiInput.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai/parse-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: aiInput,
          services: services.map((s) => ({ name: s.name, category: s.category, pricingType: s.pricingType, basePrice: s.basePrice })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAiResult(data);

      if (data.clarificationQuestions?.length > 0) {
        setStep("clarification");
      } else {
        setStep("review");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "AI parsing failed";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleClarificationSubmit() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/parse-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: aiInput,
          services: services.map((s) => ({ name: s.name, category: s.category, pricingType: s.pricingType, basePrice: s.basePrice })),
          clarificationAnswers,
          existingData: aiResult?.parsedData,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAiResult(data);
      setStep("review");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to process answers";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateEstimate() {
    setLoading(true);
    try {
      const res = await fetch("/api/estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: isNewCustomer ? null : selectedCustomerId,
          newCustomer: isNewCustomer ? newCustomer : null,
          aiInput,
          aiResult,
          services,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Estimate created!", description: `Estimate ${data.estimateNumber} is ready for review.` });
      router.push(`/estimates/${data.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create estimate";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const parsedData = aiResult?.parsedData as Record<string, unknown> | undefined;

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {(["customer", "intake", "clarification", "review"] as Step[]).map((s, i) => {
          const steps = ["customer", "intake", "clarification", "review"];
          const currentIndex = steps.indexOf(step);
          const stepIndex = steps.indexOf(s);
          const labels = ["Customer", "Job Details", "Clarification", "Review"];
          return (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <div className="h-px w-8 bg-slate-200" />}
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                stepIndex < currentIndex
                  ? "bg-green-100 text-green-700"
                  : stepIndex === currentIndex
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-100 text-slate-500"
              }`}>
                {stepIndex < currentIndex && <CheckCircle className="w-3 h-3" />}
                {labels[i]}
              </div>
            </div>
          );
        })}
      </div>

      {/* Step: Customer */}
      {step === "customer" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Customer Information
            </CardTitle>
            <CardDescription>Select an existing customer or create a new one</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Button
                variant={!isNewCustomer ? "default" : "outline"}
                onClick={() => setIsNewCustomer(false)}
                size="sm"
              >
                Existing Customer
              </Button>
              <Button
                variant={isNewCustomer ? "default" : "outline"}
                onClick={() => setIsNewCustomer(true)}
                size="sm"
              >
                <PlusCircle className="w-4 h-4 mr-1" />
                New Customer
              </Button>
            </div>

            {!isNewCustomer ? (
              <div className="space-y-2">
                <Label>Select Customer</Label>
                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Search customers..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {c.phone && `· ${c.phone}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer Name *</Label>
                  <Input
                    placeholder="John Smith"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    placeholder="(801) 555-0100"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer((p) => ({ ...p, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    placeholder="john@email.com"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer((p) => ({ ...p, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Project Address</Label>
                  <Input
                    placeholder="123 Main St, Draper, UT"
                    value={newCustomer.projectAddress}
                    onChange={(e) => setNewCustomer((p) => ({ ...p, projectAddress: e.target.value }))}
                  />
                </div>
              </div>
            )}

            <Button
              onClick={() => setStep("intake")}
              disabled={!isNewCustomer ? !selectedCustomerId : !newCustomer.name}
            >
              Continue <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step: AI Intake */}
      {step === "intake" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              Describe the Job
            </CardTitle>
            <CardDescription>
              Talk naturally — describe the job like you would to a coworker. The AI will structure everything for you.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600 border border-slate-200">
              <p className="font-medium mb-2">Example:</p>
              <p className="italic">
                &ldquo;Garage in Draper. 520 square feet. Full flake system. 35 linear feet of stem walls.
                Two medium cracks. Existing coating is peeling near the door. Customer wants ash gray.
                Wants it done this month.&rdquo;
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="aiInput">Job Description</Label>
              <Textarea
                id="aiInput"
                placeholder="Describe the job here..."
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                className="min-h-[150px] text-base"
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("customer")}>Back</Button>
              <Button onClick={handleAiParse} disabled={loading || !aiInput.trim()}>
                {loading ? (
                  <><Loader2 className="mr-2 w-4 h-4 animate-spin" /> Analyzing...</>
                ) : (
                  <><Sparkles className="mr-2 w-4 h-4" /> Analyze with AI</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Clarification */}
      {step === "clarification" && aiResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-orange-500" />
              A Few Quick Questions
            </CardTitle>
            <CardDescription>
              The AI needs a bit more info to complete your estimate accurately
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {aiResult.clarificationQuestions.map((q, i) => (
              <div key={i} className="space-y-2">
                <Label>{q}</Label>
                <Input
                  placeholder="Type your answer..."
                  value={clarificationAnswers[q] || ""}
                  onChange={(e) =>
                    setClarificationAnswers((prev) => ({ ...prev, [q]: e.target.value }))
                  }
                />
              </div>
            ))}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("intake")}>Back</Button>
              <Button onClick={handleClarificationSubmit} disabled={loading}>
                {loading ? (
                  <><Loader2 className="mr-2 w-4 h-4 animate-spin" /> Processing...</>
                ) : (
                  <>Continue <ArrowRight className="ml-2 w-4 h-4" /></>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Review */}
      {step === "review" && aiResult && (
        <div className="space-y-4">
          {/* Parsed Data Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Estimate Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                {Boolean(parsedData?.squareFootage) && (
                  <div>
                    <p className="text-slate-500">Square Footage</p>
                    <p className="font-semibold">{String(parsedData!.squareFootage)} sq ft</p>
                  </div>
                )}
                {Boolean(parsedData?.linearFootage) && (
                  <div>
                    <p className="text-slate-500">Linear Footage</p>
                    <p className="font-semibold">{String(parsedData!.linearFootage)} linear ft</p>
                  </div>
                )}
                {Array.isArray(parsedData?.services) && (parsedData!.services as string[]).length > 0 && (
                  <div>
                    <p className="text-slate-500">Services</p>
                    <p className="font-semibold">{(parsedData!.services as string[]).join(", ")}</p>
                  </div>
                )}
                {Boolean(parsedData?.colorSelection) && (
                  <div>
                    <p className="text-slate-500">Color</p>
                    <p className="font-semibold">{String(parsedData!.colorSelection)}</p>
                  </div>
                )}
                {Boolean(parsedData?.projectType) && (
                  <div>
                    <p className="text-slate-500">Project Type</p>
                    <p className="font-semibold capitalize">{String(parsedData!.projectType)}</p>
                  </div>
                )}
                {Boolean(parsedData?.requestedTimeline) && (
                  <div>
                    <p className="text-slate-500">Timeline</p>
                    <p className="font-semibold">{String(parsedData!.requestedTimeline)}</p>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {Boolean(parsedData?.existingCoating) && (
                  <Badge variant="secondary">Existing Coating</Badge>
                )}
                {Boolean(parsedData?.crackRepairNeeded) && (
                  <Badge variant="secondary">Crack Repair Needed</Badge>
                )}
                {Boolean(parsedData?.stemWalls) && (
                  <Badge variant="secondary">Stem Walls</Badge>
                )}
                {Boolean(parsedData?.moistureConcerns) && (
                  <Badge variant="destructive">Moisture Concern</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Warnings */}
          {aiResult.warnings.length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-orange-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Warnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {aiResult.warnings.map((w, i) => (
                    <li key={i} className="text-sm text-orange-700">• {w}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Suggestions */}
          {aiResult.suggestions.length > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-blue-700 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  AI Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {aiResult.suggestions.map((s, i) => (
                    <li key={i} className="text-sm text-blue-700">• {s}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Upsells */}
          {aiResult.upsells.length > 0 && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-green-700 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Upsell Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {aiResult.upsells.map((u, i) => (
                    <li key={i} className="text-sm text-green-700">• {u}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Separator />

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("intake")}>Edit Description</Button>
            <Button onClick={handleCreateEstimate} disabled={loading} className="bg-green-600 hover:bg-green-700">
              {loading ? (
                <><Loader2 className="mr-2 w-4 h-4 animate-spin" /> Creating...</>
              ) : (
                <><CheckCircle className="mr-2 w-4 h-4" /> Create Estimate</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
