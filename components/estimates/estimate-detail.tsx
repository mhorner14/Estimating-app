"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft,
  FileText,
  DollarSign,
  Send,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  Loader2,
  ExternalLink,
  Edit3,
  Save,
  Plus,
  Camera,
  MessageSquare,
  StickyNote,
  Copy,
  Check,
  Download,
  Trash2,
  CopyPlus,
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  Users,
} from "lucide-react";
import {
  formatCurrency,
  formatDate,
  ESTIMATE_STATUS_LABELS,
  ESTIMATE_STATUS_COLORS,
} from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProposalPreview } from "./proposal-preview";
import { AddLineItemDialog } from "./add-line-item-dialog";
import { AIChat } from "./ai-chat";
import { EstimateNotes } from "./estimate-notes";
import { PhotoUpload } from "./photo-upload";
import { JobCostsPanel } from "./job-costs-panel";
import { PricingInsights } from "./pricing-insights";
import { MaterialCalculator } from "./material-calculator";
import { ChangeOrdersPanel } from "@/components/change-orders/change-orders-panel";

interface EstimateDetailProps {
  estimate: any;
  services: any[];
}

export function EstimateDetail({ estimate: initialEstimate, services }: EstimateDetailProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [estimate, setEstimate] = useState(initialEstimate);
  const [loading, setLoading] = useState(false);
  const [generatingProposal, setGeneratingProposal] = useState(false);
  const [editingLine, setEditingLine] = useState<string | null>(null);
  const [lineEdits, setLineEdits] = useState<Record<string, any>>({});
  const [addLineOpen, setAddLineOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [notes, setNotes] = useState(initialEstimate.notes || []);
  const [photos, setPhotos] = useState(initialEstimate.photos || []);
  const [discountInput, setDiscountInput] = useState(String(initialEstimate.discountAmount || "0"));
  const [savingDiscount, setSavingDiscount] = useState(false);
  const [editingJobDetails, setEditingJobDetails] = useState(false);
  const [jobDetailsForm, setJobDetailsForm] = useState({
    colorSelection: initialEstimate.colorSelection || "",
    requestedTimeline: initialEstimate.requestedTimeline || "",
    squareFootage: String(initialEstimate.squareFootage || ""),
    scheduledDate: initialEstimate.scheduledDate ? new Date(initialEstimate.scheduledDate).toISOString().split("T")[0] : "",
    validUntil: initialEstimate.validUntil ? new Date(initialEstimate.validUntil).toISOString().split("T")[0] : "",
  });
  const [savingJobDetails, setSavingJobDetails] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [requestingReview, setRequestingReview] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composePurpose, setComposePurpose] = useState("follow_up");
  const [composeCustom, setComposeCustom] = useState("");
  const [composedEmail, setComposedEmail] = useState<{ subject: string; body: string } | null>(null);
  const [composing, setComposing] = useState(false);
  const [sendingComposed, setSendingComposed] = useState(false);
  const [sendingFollowUp, setSendingFollowUp] = useState(false);
  const [sendingBalance, setSendingBalance] = useState(false);
  const [markLostOpen, setMarkLostOpen] = useState(false);
  const [crewOpen, setCrewOpen] = useState(false);
  const [crewEmails, setCrewEmails] = useState("");
  const [crewMessage, setCrewMessage] = useState("");
  const [sendingCrew, setSendingCrew] = useState(false);
  const [savedCrew, setSavedCrew] = useState<Array<{ id: string; name: string; email: string | null }>>([]);
  const [copiedCrewLink, setCopiedCrewLink] = useState(false);
  const [lostReason, setLostReason] = useState("");
  const [customLostReason, setCustomLostReason] = useState("");

  const aiSuggestions = estimate.aiSuggestions as any;

  const proposalLink = estimate.proposal?.publicToken
    ? `${process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "")}/proposal/${estimate.proposal.publicToken}`
    : null;

  async function copyProposalLink() {
    if (!proposalLink) return;
    await navigator.clipboard.writeText(proposalLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    toast({ title: "Link copied!" });
  }

  async function updateStatus(status: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/estimates/${estimate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update");
      const updated = await res.json();
      setEstimate((e: any) => ({ ...e, ...updated }));
      toast({ title: "Status updated" });
    } catch {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function confirmMarkLost() {
    const reason = lostReason === "Other" ? customLostReason : lostReason;
    setLoading(true);
    try {
      const res = await fetch(`/api/estimates/${estimate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "LOST", lostReason: reason || undefined }),
      });
      if (!res.ok) throw new Error("Failed to update");
      const updated = await res.json();
      setEstimate((e: any) => ({ ...e, ...updated }));
      toast({ title: "Estimate marked as lost" });
      setMarkLostOpen(false);
      setLostReason("");
      setCustomLostReason("");
    } catch {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function generateProposal() {
    setGeneratingProposal(true);
    try {
      const res = await fetch(`/api/estimates/${estimate.id}/generate-proposal`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to generate");
      const updated = await res.json();
      setEstimate(updated);
      toast({ title: "Proposal generated!", description: "Review and send to customer." });
    } catch {
      toast({ title: "Error", description: "Failed to generate proposal", variant: "destructive" });
    } finally {
      setGeneratingProposal(false);
    }
  }

  async function sendProposal() {
    setLoading(true);
    try {
      const res = await fetch(`/api/estimates/${estimate.id}/send`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to send");
      const updated = await res.json();
      setEstimate(updated);
      const hasEmail = estimate.project?.customer?.email;
      toast({
        title: "Proposal sent!",
        description: hasEmail
          ? "Email sent to customer."
          : "Proposal link is ready — share with customer.",
      });
    } catch {
      toast({ title: "Error", description: "Failed to send proposal", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function sendFollowUp() {
    setSendingFollowUp(true);
    try {
      const res = await fetch(`/api/estimates/${estimate.id}/follow-up`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast({ title: "Follow-up sent!", description: "Reminder email sent to customer." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to send follow-up", variant: "destructive" });
    } finally {
      setSendingFollowUp(false);
    }
  }

  async function sendBalanceRequest() {
    setSendingBalance(true);
    try {
      const res = await fetch(`/api/estimates/${estimate.id}/send-balance`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast({ title: "Balance request sent!", description: "Payment link emailed to customer." });
      setEstimate((e: any) => ({ ...e, status: "BALANCE_DUE" }));
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to send balance request", variant: "destructive" });
    } finally {
      setSendingBalance(false);
    }
  }

  async function deleteEstimate() {
    if (!confirm("Delete this estimate? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/estimates/${estimate.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast({ title: "Estimate deleted" });
      router.push("/estimates");
    } catch {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
      setDeleting(false);
    }
  }

  async function duplicateEstimate() {
    setDuplicating(true);
    try {
      const res = await fetch(`/api/estimates/${estimate.id}/duplicate`, { method: "POST" });
      if (!res.ok) throw new Error();
      const copy = await res.json();
      toast({ title: "Estimate duplicated" });
      router.push(`/estimates/${copy.id}`);
    } catch {
      toast({ title: "Error", description: "Failed to duplicate", variant: "destructive" });
      setDuplicating(false);
    }
  }

  async function saveAsTemplate() {
    const name = prompt("Template name:", `${estimate.project?.customer?.name || ""} – ${estimate.estimateNumber}`);
    if (!name) return;
    setSavingTemplate(true);
    try {
      const lineItems = estimate.lineItems.map((li: any) => ({
        description: li.description || li.service?.name || "",
        quantity: Number(li.quantity),
        unitPrice: Number(li.unitPrice),
        unit: li.unit || "sqft",
        serviceId: li.serviceId || null,
      }));
      await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, lineItems, notes: estimate.internalNotes || "" }),
      });
      toast({ title: "Saved as template", description: name });
    } catch {
      toast({ title: "Error", description: "Failed to save template", variant: "destructive" });
    } finally {
      setSavingTemplate(false);
    }
  }

  async function composeEmail() {
    setComposing(true);
    setComposedEmail(null);
    try {
      const res = await fetch(`/api/estimates/${estimate.id}/compose-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose: composePurpose, customContext: composeCustom }),
      });
      const data = await res.json();
      setComposedEmail(data);
    } catch {
      toast({ title: "Error composing email", variant: "destructive" });
    } finally {
      setComposing(false);
    }
  }

  async function sendComposedEmail() {
    if (!composedEmail || !estimate.project?.customer?.email) return;
    setSendingComposed(true);
    try {
      const res = await fetch(`/api/estimates/${estimate.id}/send-custom-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: composedEmail.subject, body: composedEmail.body }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Email sent!", description: `Sent to ${estimate.project.customer.email}` });
      setComposeOpen(false);
      setComposedEmail(null);
    } catch {
      toast({ title: "Error sending email", variant: "destructive" });
    } finally {
      setSendingComposed(false);
    }
  }

  async function requestReview() {
    setRequestingReview(true);
    try {
      const res = await fetch(`/api/estimates/${estimate.id}/request-review`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast({ title: "Review request sent!", description: "Email sent to customer." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setRequestingReview(false);
    }
  }

  async function openCrewModal() {
    setCrewOpen(true);
    try {
      const res = await fetch("/api/crew");
      if (res.ok) setSavedCrew(await res.json());
    } catch { /* non-fatal */ }
  }

  function toggleCrewMember(email: string) {
    const current = crewEmails.split(/[\s,;]+/).filter(Boolean);
    if (current.includes(email)) {
      setCrewEmails(current.filter((e) => e !== email).join(", "));
    } else {
      setCrewEmails([...current, email].filter(Boolean).join(", "));
    }
  }

  async function sendToCrew() {
    const emails = crewEmails.split(/[\s,;]+/).filter((e) => e.includes("@"));
    if (!emails.length) { toast({ title: "Enter at least one crew email", variant: "destructive" }); return; }
    setSendingCrew(true);
    try {
      const res = await fetch(`/api/estimates/${estimate.id}/send-crew`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crewEmails: emails, message: crewMessage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast({ title: "Job sheet sent!", description: `Sent to ${emails.length} crew member${emails.length !== 1 ? "s" : ""}` });
      setCrewOpen(false);
      setCrewEmails("");
      setCrewMessage("");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSendingCrew(false);
    }
  }

  async function saveJobDetails() {
    setSavingJobDetails(true);
    try {
      const res = await fetch(`/api/estimates/${estimate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          colorSelection: jobDetailsForm.colorSelection || null,
          requestedTimeline: jobDetailsForm.requestedTimeline || null,
          squareFootage: jobDetailsForm.squareFootage ? parseFloat(jobDetailsForm.squareFootage) : null,
          scheduledDate: jobDetailsForm.scheduledDate || null,
          validUntil: jobDetailsForm.validUntil || null,
        }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setEstimate((e: any) => ({ ...e, ...updated }));
      setEditingJobDetails(false);
      toast({ title: "Job details saved" });
    } catch {
      toast({ title: "Error", description: "Failed to save", variant: "destructive" });
    } finally {
      setSavingJobDetails(false);
    }
  }

  async function applyDiscount() {
    const amount = parseFloat(discountInput) || 0;
    setSavingDiscount(true);
    try {
      const res = await fetch(`/api/estimates/${estimate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discountAmount: amount }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setEstimate((e: any) => ({ ...e, ...updated }));
      toast({ title: "Discount applied" });
    } catch {
      toast({ title: "Error", description: "Failed to apply discount", variant: "destructive" });
    } finally {
      setSavingDiscount(false);
    }
  }

  async function moveLineItem(index: number, direction: "up" | "down") {
    const items = [...estimate.lineItems];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    [items[index], items[targetIndex]] = [items[targetIndex], items[index]];
    const reordered = items.map((item: any, i: number) => ({ ...item, sortOrder: i }));
    setEstimate((e: any) => ({ ...e, lineItems: reordered }));
    await Promise.all(
      [reordered[index], reordered[targetIndex]].map((item: any) =>
        fetch(`/api/estimates/${estimate.id}/line-items/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: item.sortOrder }),
        })
      )
    );
  }

  async function saveLineItem(lineItemId: string) {
    const edits = lineEdits[lineItemId];
    if (!edits) return;

    const newQty = parseFloat(edits.quantity);
    const newPrice = parseFloat(edits.unitPrice);
    const newTotal = newQty * newPrice;

    try {
      const res = await fetch(
        `/api/estimates/${estimate.id}/line-items/${lineItemId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...edits,
            quantity: newQty,
            unitPrice: newPrice,
            totalPrice: newTotal,
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to save");
      const updated = await res.json();
      setEstimate(updated);
      setEditingLine(null);
      toast({ title: "Line item updated" });
    } catch {
      toast({ title: "Error", description: "Failed to save", variant: "destructive" });
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-3 -ml-2">
            <Link href="/estimates">
              <ArrowLeft className="w-4 h-4 mr-1" /> Estimates
            </Link>
          </Button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900">
              {estimate.project.customer.name}
            </h1>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                ESTIMATE_STATUS_COLORS[estimate.status]
              }`}
            >
              {ESTIMATE_STATUS_LABELS[estimate.status]}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 flex-wrap">
            <span>{estimate.estimateNumber}</span>
            <span>·</span>
            <span>{formatDate(estimate.createdAt)}</span>
            {estimate.project.customer.phone && (
              <>
                <span>·</span>
                <a
                  href={`tel:${estimate.project.customer.phone}`}
                  className="hover:text-blue-600 hover:underline"
                >
                  {estimate.project.customer.phone}
                </a>
              </>
            )}
            {estimate.project.customer.email && (
              <>
                <span>·</span>
                <a
                  href={`mailto:${estimate.project.customer.email}`}
                  className="hover:text-blue-600 hover:underline"
                >
                  {estimate.project.customer.email}
                </a>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {estimate.status === "READY_FOR_REVIEW" && !estimate.scopeOfWork && (
            <Button
              onClick={generateProposal}
              disabled={generatingProposal}
              variant="outline"
            >
              {generatingProposal ? (
                <><Loader2 className="mr-2 w-4 h-4 animate-spin" /> Generating...</>
              ) : (
                <><Sparkles className="mr-2 w-4 h-4" /> Generate Proposal</>
              )}
            </Button>
          )}
          {estimate.scopeOfWork &&
            !["SENT", "VIEWED", "ACCEPTED", "DEPOSIT_PAID"].includes(estimate.status) && (
              <Button onClick={sendProposal} disabled={loading}>
                <Send className="mr-2 w-4 h-4" /> Send to Customer
              </Button>
            )}
          {proposalLink && (
            <Button variant="outline" onClick={copyProposalLink}>
              {copiedLink ? (
                <><Check className="mr-2 w-4 h-4 text-green-600" /> Copied!</>
              ) : (
                <><Copy className="mr-2 w-4 h-4" /> Copy Link</>
              )}
            </Button>
          )}
          {proposalLink && (
            <Button variant="outline" asChild>
              <a href={proposalLink} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 w-4 h-4" /> View Proposal
                {estimate.proposal?.viewCount > 0 && (
                  <span className="ml-2 bg-slate-100 text-slate-600 text-xs px-1.5 py-0.5 rounded-full">
                    {estimate.proposal.viewCount} view{estimate.proposal.viewCount !== 1 ? "s" : ""}
                  </span>
                )}
              </a>
            </Button>
          )}
          {estimate.scopeOfWork && (
            <Button variant="outline" asChild>
              <a href={`/api/estimates/${estimate.id}/pdf`} download>
                <Download className="mr-2 w-4 h-4" /> Download PDF
              </a>
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {estimate.project?.customer?.email && (
                <DropdownMenuItem onClick={() => { setComposeOpen(true); setComposedEmail(null); }}>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  AI Email Composer
                </DropdownMenuItem>
              )}
              {["ACCEPTED", "DEPOSIT_PAID", "SCHEDULED", "IN_PROGRESS"].includes(estimate.status) && (
                <DropdownMenuItem onClick={openCrewModal}>
                  <Users className="w-4 h-4 mr-2" />
                  Send Job Sheet to Crew
                </DropdownMenuItem>
              )}
              {estimate.crewPhotoToken && ["ACCEPTED", "DEPOSIT_PAID", "SCHEDULED", "IN_PROGRESS", "COMPLETED"].includes(estimate.status) && (
                <DropdownMenuItem onClick={() => {
                  const url = `${window.location.origin}/crew-upload/${estimate.crewPhotoToken}`;
                  navigator.clipboard.writeText(url);
                  setCopiedCrewLink(true);
                  setTimeout(() => setCopiedCrewLink(false), 2000);
                  toast({ title: "Crew photo link copied" });
                }}>
                  {copiedCrewLink ? <Check className="w-4 h-4 mr-2 text-emerald-500" /> : <Camera className="w-4 h-4 mr-2" />}
                  Copy Crew Photo Link
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={duplicateEstimate} disabled={duplicating}>
                <CopyPlus className="w-4 h-4 mr-2" />
                {duplicating ? "Duplicating..." : "Duplicate Estimate"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={saveAsTemplate} disabled={savingTemplate}>
                <FileText className="w-4 h-4 mr-2" />
                {savingTemplate ? "Saving..." : "Save as Template"}
              </DropdownMenuItem>
              {["SENT", "VIEWED"].includes(estimate.status) && estimate.project?.customer?.email && (
                <DropdownMenuItem onClick={sendFollowUp} disabled={sendingFollowUp}>
                  <Send className="w-4 h-4 mr-2" />
                  {sendingFollowUp ? "Sending..." : "Send Follow-up Email"}
                </DropdownMenuItem>
              )}
              {["COMPLETED", "IN_PROGRESS", "SCHEDULED", "DEPOSIT_PAID"].includes(estimate.status) && estimate.project?.customer?.email && (
                <DropdownMenuItem onClick={sendBalanceRequest} disabled={sendingBalance}>
                  <DollarSign className="w-4 h-4 mr-2" />
                  {sendingBalance ? "Sending..." : "Send Balance Request"}
                </DropdownMenuItem>
              )}
              {["COMPLETED", "PAID_IN_FULL"].includes(estimate.status) && estimate.project?.customer?.email && (
                <DropdownMenuItem onClick={requestReview} disabled={requestingReview}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {requestingReview ? "Sending..." : "Request Google Review"}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={deleteEstimate}
                disabled={deleting}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {deleting ? "Deleting..." : "Delete Estimate"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* AI Alerts */}
      {aiSuggestions?.warnings?.length > 0 && (
        <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center gap-2 text-orange-700 font-medium text-sm mb-2">
            <AlertTriangle className="w-4 h-4" /> Warnings
          </div>
          <ul className="space-y-1">
            {aiSuggestions.warnings.map((w: string, i: number) => (
              <li key={i} className="text-sm text-orange-700">
                • {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Tabs defaultValue="estimate">
        <TabsList className="mb-6 flex-wrap h-auto">
          <TabsTrigger value="estimate">
            <FileText className="w-4 h-4 mr-1.5" /> Estimate
          </TabsTrigger>
          <TabsTrigger value="proposal">
            <FileText className="w-4 h-4 mr-1.5" /> Proposal
          </TabsTrigger>
          <TabsTrigger value="payment">
            <DollarSign className="w-4 h-4 mr-1.5" /> Payment
          </TabsTrigger>
          <TabsTrigger value="photos">
            <Camera className="w-4 h-4 mr-1.5" /> Photos
            {photos.length > 0 && (
              <span className="ml-1 text-xs bg-slate-200 text-slate-700 rounded-full px-1.5">
                {photos.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="notes">
            <StickyNote className="w-4 h-4 mr-1.5" /> Notes
            {notes.length > 0 && (
              <span className="ml-1 text-xs bg-slate-200 text-slate-700 rounded-full px-1.5">
                {notes.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="ai">
            <Sparkles className="w-4 h-4 mr-1.5" /> AI Assistant
          </TabsTrigger>
          <TabsTrigger value="costs">
            <TrendingUp className="w-4 h-4 mr-1.5" /> Job Costs
          </TabsTrigger>
          <TabsTrigger value="activity">
            Activity
          </TabsTrigger>
          {["ACCEPTED","DEPOSIT_PAID","SCHEDULED","IN_PROGRESS","COMPLETED"].includes(estimate.status) && (
            <TabsTrigger value="change-orders">
              Change Orders
            </TabsTrigger>
          )}
        </TabsList>

        {/* Estimate Tab */}
        <TabsContent value="estimate" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {/* Line Items */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between py-4">
                  <CardTitle className="text-base">Line Items</CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAddLineOpen(true)}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50">
                        <th className="text-left p-3 font-medium text-slate-600">
                          Description
                        </th>
                        <th className="text-right p-3 font-medium text-slate-600">Qty</th>
                        <th className="text-right p-3 font-medium text-slate-600 hidden sm:table-cell">
                          Unit
                        </th>
                        <th className="text-right p-3 font-medium text-slate-600 hidden sm:table-cell">
                          Price
                        </th>
                        <th className="text-right p-3 font-medium text-slate-600">Total</th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {estimate.lineItems.map((item: any, index: number) => (
                        <tr
                          key={item.id}
                          className="border-b last:border-0 hover:bg-slate-50 group"
                        >
                          {editingLine === item.id ? (
                            <>
                              <td className="p-2">
                                <Input
                                  value={lineEdits[item.id]?.description ?? item.description}
                                  onChange={(e) =>
                                    setLineEdits((p) => ({
                                      ...p,
                                      [item.id]: { ...p[item.id], description: e.target.value },
                                    }))
                                  }
                                  className="h-8 text-sm"
                                />
                              </td>
                              <td className="p-2 text-right">
                                <Input
                                  type="number"
                                  value={lineEdits[item.id]?.quantity ?? item.quantity}
                                  onChange={(e) =>
                                    setLineEdits((p) => ({
                                      ...p,
                                      [item.id]: { ...p[item.id], quantity: e.target.value },
                                    }))
                                  }
                                  className="h-8 text-sm w-20 text-right ml-auto"
                                />
                              </td>
                              <td className="p-2 text-right text-slate-500 hidden sm:table-cell">
                                {item.unit}
                              </td>
                              <td className="p-2 text-right hidden sm:table-cell">
                                <Input
                                  type="number"
                                  value={lineEdits[item.id]?.unitPrice ?? item.unitPrice}
                                  onChange={(e) =>
                                    setLineEdits((p) => ({
                                      ...p,
                                      [item.id]: { ...p[item.id], unitPrice: e.target.value },
                                    }))
                                  }
                                  className="h-8 text-sm w-24 text-right ml-auto"
                                />
                              </td>
                              <td className="p-3 text-right font-medium">
                                {formatCurrency(
                                  (lineEdits[item.id]?.quantity ?? item.quantity) *
                                    (lineEdits[item.id]?.unitPrice ?? item.unitPrice)
                                )}
                              </td>
                              <td className="p-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => saveLineItem(item.id)}
                                >
                                  <Save className="w-3 h-3" />
                                </Button>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="p-3">
                                <span
                                  className={
                                    item.isOptional ? "text-slate-400" : "text-slate-900"
                                  }
                                >
                                  {item.description}
                                </span>
                                {item.isOptional && (
                                  <Badge
                                    variant="outline"
                                    className="ml-2 text-xs"
                                  >
                                    Optional
                                  </Badge>
                                )}
                              </td>
                              <td className="p-3 text-right text-slate-600">
                                {item.quantity.toLocaleString()}
                              </td>
                              <td className="p-3 text-right text-slate-500 hidden sm:table-cell">
                                {item.unit}
                              </td>
                              <td className="p-3 text-right text-slate-600 hidden sm:table-cell">
                                {formatCurrency(item.unitPrice)}
                              </td>
                              <td className="p-3 text-right font-medium">
                                {formatCurrency(item.totalPrice)}
                              </td>
                              <td className="p-2">
                                <div className="flex items-center gap-0.5">
                                  <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => moveLineItem(index, "up")}
                                      disabled={index === 0}
                                      className="text-slate-400 hover:text-slate-600 disabled:opacity-30 p-0.5"
                                    >
                                      <ArrowUp className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => moveLineItem(index, "down")}
                                      disabled={index === estimate.lineItems.length - 1}
                                      className="text-slate-400 hover:text-slate-600 disabled:opacity-30 p-0.5"
                                    >
                                      <ArrowDown className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingLine(item.id);
                                      setLineEdits((p) => ({
                                        ...p,
                                        [item.id]: { ...item },
                                      }));
                                    }}
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {/* Job Details */}
              <Card>
                <CardHeader className="py-4 flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Job Details</CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => {
                      setJobDetailsForm({
                        colorSelection: estimate.colorSelection || "",
                        requestedTimeline: estimate.requestedTimeline || "",
                        squareFootage: String(estimate.squareFootage || ""),
                        scheduledDate: estimate.scheduledDate ? new Date(estimate.scheduledDate).toISOString().split("T")[0] : "",
                        validUntil: estimate.validUntil ? new Date(estimate.validUntil).toISOString().split("T")[0] : "",
                      });
                      setEditingJobDetails(true);
                    }}
                  >
                    <Edit3 className="w-3 h-3 mr-1" /> Edit
                  </Button>
                </CardHeader>
                {editingJobDetails ? (
                  <CardContent className="space-y-3 text-sm">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500">Square Footage</label>
                      <Input
                        type="number"
                        value={jobDetailsForm.squareFootage}
                        onChange={(e) => setJobDetailsForm((f) => ({ ...f, squareFootage: e.target.value }))}
                        className="h-8 text-sm"
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500">Color Selection</label>
                      <Input
                        value={jobDetailsForm.colorSelection}
                        onChange={(e) => setJobDetailsForm((f) => ({ ...f, colorSelection: e.target.value }))}
                        className="h-8 text-sm"
                        placeholder="e.g. Silver Gray Flake"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500">Timeline</label>
                      <Input
                        value={jobDetailsForm.requestedTimeline}
                        onChange={(e) => setJobDetailsForm((f) => ({ ...f, requestedTimeline: e.target.value }))}
                        className="h-8 text-sm"
                        placeholder="e.g. Spring 2025"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500">Scheduled Date</label>
                      <Input
                        type="date"
                        value={jobDetailsForm.scheduledDate}
                        onChange={(e) => setJobDetailsForm((f) => ({ ...f, scheduledDate: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500">Proposal Valid Until</label>
                      <Input
                        type="date"
                        value={jobDetailsForm.validUntil}
                        onChange={(e) => setJobDetailsForm((f) => ({ ...f, validUntil: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" onClick={saveJobDetails} disabled={savingJobDetails}>
                        {savingJobDetails ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Save className="w-3 h-3 mr-1" />Save</>}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingJobDetails(false)}>Cancel</Button>
                    </div>
                  </CardContent>
                ) : (
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  {estimate.squareFootage && (
                    <div>
                      <p className="text-slate-500">Square Footage</p>
                      <p className="font-medium">
                        {estimate.squareFootage.toLocaleString()} sq ft
                      </p>
                    </div>
                  )}
                  {estimate.colorSelection && (
                    <div>
                      <p className="text-slate-500">Color Selection</p>
                      <p className="font-medium">{estimate.colorSelection}</p>
                    </div>
                  )}
                  {estimate.requestedTimeline && (
                    <div>
                      <p className="text-slate-500">Timeline</p>
                      <p className="font-medium">{estimate.requestedTimeline}</p>
                    </div>
                  )}
                  {estimate.scheduledDate && (
                    <div>
                      <p className="text-slate-500">Scheduled Date</p>
                      <p className="font-medium">{new Date(estimate.scheduledDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                    </div>
                  )}
                  {estimate.validUntil && (
                    <div>
                      <p className="text-slate-500">Valid Until</p>
                      <p className={`font-medium ${new Date(estimate.validUntil) < new Date() ? "text-red-600" : ""}`}>
                        {new Date(estimate.validUntil).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        {new Date(estimate.validUntil) < new Date() && " (expired)"}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-slate-500">Conditions</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {estimate.existingCoating && (
                        <Badge variant="secondary" className="text-xs">
                          Existing Coating
                        </Badge>
                      )}
                      {estimate.crackRepairNeeded && (
                        <Badge variant="secondary" className="text-xs">
                          Crack Repair
                        </Badge>
                      )}
                      {estimate.moistureConcerns && (
                        <Badge variant="destructive" className="text-xs">
                          Moisture Concern
                        </Badge>
                      )}
                      {!estimate.existingCoating &&
                        !estimate.crackRepairNeeded &&
                        !estimate.moistureConcerns && (
                          <span className="text-slate-400 text-xs">Standard conditions</span>
                        )}
                    </div>
                  </div>
                </CardContent>
                )}
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-base">Discount</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={discountInput}
                        onChange={(e) => setDiscountInput(e.target.value)}
                        className="pl-7 h-9"
                        placeholder="0.00"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={applyDiscount}
                      disabled={savingDiscount}
                    >
                      {savingDiscount ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Apply"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-base">Pricing Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-medium">{formatCurrency(estimate.subtotal)}</span>
                  </div>
                  {estimate.discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-{formatCurrency(estimate.discountAmount)}</span>
                    </div>
                  )}
                  {estimate.taxAmount > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Tax</span>
                      <span>{formatCurrency(estimate.taxAmount)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>{formatCurrency(estimate.totalAmount)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-blue-600">
                    <span>Deposit (50%)</span>
                    <span className="font-medium">
                      {formatCurrency(estimate.depositAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Balance Due</span>
                    <span className="font-medium">{formatCurrency(estimate.balanceDue)}</span>
                  </div>
                </CardContent>
              </Card>

              {estimate.estimatedMargin > 0 && (
                <Card
                  className={
                    estimate.estimatedMargin < 30
                      ? "border-orange-200 bg-orange-50"
                      : "border-green-200 bg-green-50"
                  }
                >
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp
                        className={`w-4 h-4 ${
                          estimate.estimatedMargin < 30
                            ? "text-orange-600"
                            : "text-green-600"
                        }`}
                      />
                      <span
                        className={`text-sm font-medium ${
                          estimate.estimatedMargin < 30
                            ? "text-orange-700"
                            : "text-green-700"
                        }`}
                      >
                        Gross Margin
                      </span>
                    </div>
                    <p
                      className={`text-2xl font-bold ${
                        estimate.estimatedMargin < 30
                          ? "text-orange-700"
                          : "text-green-700"
                      }`}
                    >
                      {estimate.estimatedMargin.toFixed(1)}%
                    </p>
                    {estimate.estimatedMargin < 30 && (
                      <p className="text-xs text-orange-600 mt-1">
                        Below target — review pricing
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* AI Upsells */}
              {aiSuggestions?.upsells?.length > 0 && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm text-blue-700 flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" /> Upsell Opportunities
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 pb-3">
                    <ul className="space-y-1">
                      {aiSuggestions.upsells.map((u: string, i: number) => (
                        <li key={i} className="text-xs text-blue-700">
                          • {u}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Status Controls */}
              <Card>
                <CardContent className="pt-4 pb-4 space-y-2">
                  <p className="text-xs font-medium text-slate-500 mb-3">Update Status</p>
                  {estimate.status === "DRAFT" && (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => updateStatus("READY_FOR_REVIEW")}
                      disabled={loading}
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Mark Ready
                    </Button>
                  )}
                  {estimate.status === "NEEDS_CLARIFICATION" && (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => updateStatus("READY_FOR_REVIEW")}
                      disabled={loading}
                    >
                      Mark Ready for Review
                    </Button>
                  )}
                  {["SENT", "VIEWED"].includes(estimate.status) && (
                    <Button
                      size="sm"
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => updateStatus("ACCEPTED")}
                      disabled={loading}
                    >
                      Mark Accepted
                    </Button>
                  )}
                  {estimate.status === "ACCEPTED" && (
                    <Button
                      size="sm"
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={() => updateStatus("DEPOSIT_PAID")}
                      disabled={loading}
                    >
                      Mark Deposit Paid
                    </Button>
                  )}
                  {estimate.status === "DEPOSIT_PAID" && (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => updateStatus("SCHEDULED")}
                      disabled={loading}
                    >
                      Mark Scheduled
                    </Button>
                  )}
                  {estimate.status === "SCHEDULED" && (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => updateStatus("IN_PROGRESS")}
                      disabled={loading}
                    >
                      Mark In Progress
                    </Button>
                  )}
                  {estimate.status === "IN_PROGRESS" && (
                    <Button
                      size="sm"
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => updateStatus("COMPLETED")}
                      disabled={loading}
                    >
                      Mark Completed
                    </Button>
                  )}
                  {estimate.status === "COMPLETED" && (
                    <Button
                      size="sm"
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => updateStatus("PAID_IN_FULL")}
                      disabled={loading}
                    >
                      Mark Paid in Full
                    </Button>
                  )}
                  <Separator />
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => setMarkLostOpen(true)}
                    disabled={loading}
                  >
                    Mark as Lost
                  </Button>
                </CardContent>
              </Card>

              {/* Material calculator */}
              <MaterialCalculator squareFootage={estimate.squareFootage} />

              {/* Pricing insights */}
              {["DRAFT", "READY_FOR_REVIEW", "SENT", "VIEWED"].includes(estimate.status) && (
                <PricingInsights estimateId={estimate.id} totalAmount={Number(estimate.totalAmount)} />
              )}
            </div>
          </div>
        </TabsContent>

        {/* Proposal Tab */}
        <TabsContent value="proposal">
          <ProposalPreview
            estimate={estimate}
            onGenerate={generateProposal}
            generating={generatingProposal}
          />
        </TabsContent>

        {/* Payment Tab */}
        <TabsContent value="payment">
          <PaymentTab estimate={estimate} onUpdate={setEstimate} />
        </TabsContent>

        {/* Photos Tab */}
        <TabsContent value="photos">
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base">Project Photos</CardTitle>
            </CardHeader>
            <CardContent>
              <PhotoUpload
                estimateId={estimate.id}
                photos={photos}
                onUpdate={setPhotos}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes">
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base">Internal Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <EstimateNotes
                estimateId={estimate.id}
                notes={notes}
                onNoteAdded={(note) => setNotes((n: any) => [note, ...n])}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Assistant Tab */}
        <TabsContent value="ai">
          <Card>
            <CardContent className="p-0">
              <AIChat estimateId={estimate.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs">
          <JobCostsPanel estimate={estimate} onUpdate={(data) => setEstimate((e: any) => ({ ...e, ...data }))} />
        </TabsContent>

        <TabsContent value="activity">
          <ActivityFeed estimateId={estimate.id} />
        </TabsContent>
        {["ACCEPTED","DEPOSIT_PAID","SCHEDULED","IN_PROGRESS","COMPLETED"].includes(estimate.status) && (
          <TabsContent value="change-orders">
            <ChangeOrdersPanel estimateId={estimate.id} />
          </TabsContent>
        )}
      </Tabs>

      {/* Add Line Item Dialog */}
      <AddLineItemDialog
        estimateId={estimate.id}
        services={services}
        open={addLineOpen}
        onClose={() => setAddLineOpen(false)}
        onAdded={setEstimate}
      />

      {/* Mark Lost Modal */}
      {markLostOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Mark Estimate as Lost</h2>
            <p className="text-sm text-slate-500 mb-4">Help track why this estimate was lost. This data improves your close rate over time.</p>
            <div className="space-y-2 mb-4">
              {["Price too high", "Went with competitor", "Customer not ready", "No response", "Project cancelled", "Out of service area", "Other"].map((r) => (
                <button
                  key={r}
                  onClick={() => setLostReason(r)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${lostReason === r ? "border-red-500 bg-red-50 text-red-700" : "border-slate-200 hover:border-slate-300 text-slate-700"}`}
                >
                  {r}
                </button>
              ))}
            </div>
            {lostReason === "Other" && (
              <Input
                placeholder="Describe the reason..."
                value={customLostReason}
                onChange={(e) => setCustomLostReason(e.target.value)}
                className="mb-4"
              />
            )}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setMarkLostOpen(false); setLostReason(""); setCustomLostReason(""); }}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={confirmMarkLost}
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Lost"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* AI Email Composer Modal */}
      {composeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">AI Email Composer</h2>
            <p className="text-sm text-slate-500 mb-4">Generate a personalized email for {estimate.project?.customer?.name}</p>

            {!composedEmail ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-2 block">What type of email?</label>
                  <div className="space-y-2">
                    {[
                      { id: "send_proposal", label: "Introduce & send proposal" },
                      { id: "follow_up", label: "Follow up on sent proposal" },
                      { id: "check_in", label: "Check in after job completion" },
                      { id: "custom", label: "Custom (describe below)" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setComposePurpose(opt.id)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${composePurpose === opt.id ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 hover:border-slate-300 text-slate-700"}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                {composePurpose === "custom" && (
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Describe the email</label>
                    <Textarea
                      placeholder="e.g. Ask about their timeline and offer a discount if they book this week"
                      value={composeCustom}
                      onChange={(e) => setComposeCustom(e.target.value)}
                      rows={3}
                    />
                  </div>
                )}
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setComposeOpen(false)}>Cancel</Button>
                  <Button className="flex-1" onClick={composeEmail} disabled={composing}>
                    {composing ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Writing…</> : "✨ Generate Email"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Subject</label>
                  <Input
                    value={composedEmail.subject}
                    onChange={(e) => setComposedEmail({ ...composedEmail, subject: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Body</label>
                  <Textarea
                    value={composedEmail.body}
                    onChange={(e) => setComposedEmail({ ...composedEmail, body: e.target.value })}
                    rows={8}
                    className="text-sm"
                  />
                </div>
                <p className="text-xs text-slate-400">To: {estimate.project?.customer?.email}</p>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setComposedEmail(null)}>Regenerate</Button>
                  <Button variant="outline" onClick={() => setComposeOpen(false)}>Cancel</Button>
                  <Button className="flex-1" onClick={sendComposedEmail} disabled={sendingComposed}>
                    {sendingComposed ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                    Send Email
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {crewOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Send Job Sheet to Crew
            </h3>
            <p className="text-sm text-slate-500">
              Send job details, address, scope of work, and crew notes to your crew via email.
            </p>
            {savedCrew.filter((m) => m.email).length > 0 && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Saved Crew</label>
                <div className="flex flex-wrap gap-2">
                  {savedCrew.filter((m) => m.email).map((m) => {
                    const active = crewEmails.split(/[\s,;]+/).includes(m.email!);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleCrewMember(m.email!)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${active ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"}`}
                      >
                        {m.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Crew Email(s)</label>
              <Textarea
                value={crewEmails}
                onChange={(e) => setCrewEmails(e.target.value)}
                placeholder="crew@example.com, lead@example.com"
                rows={2}
                className="text-sm"
              />
              <p className="text-xs text-slate-400">Separate multiple emails with commas</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Additional Message (optional)</label>
              <Textarea
                value={crewMessage}
                onChange={(e) => setCrewMessage(e.target.value)}
                placeholder="Any special instructions for the crew..."
                rows={3}
                className="text-sm"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setCrewOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={sendToCrew} disabled={sendingCrew || !crewEmails.trim()}>
                {sendingCrew ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                Send Job Sheet
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentTab({
  estimate,
  onUpdate,
}: {
  estimate: any;
  onUpdate: (e: any) => void;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [recordForm, setRecordForm] = useState({ amount: "", type: "DEPOSIT", note: "" });
  const [recording, setRecording] = useState(false);

  async function recordManualPayment() {
    if (!recordForm.amount) return;
    setRecording(true);
    try {
      const res = await fetch(`/api/estimates/${estimate.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(recordForm),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      onUpdate(data.estimate);
      setRecordForm({ amount: "", type: "DEPOSIT", note: "" });
      toast({ title: "Payment recorded" });
    } catch {
      toast({ title: "Error", description: "Failed to record payment", variant: "destructive" });
    } finally {
      setRecording(false);
    }
  }

  async function createPaymentLink(type: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/estimates/${estimate.id}/payment-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.url) window.open(data.url, "_blank");
      toast({ title: "Payment link created" });
    } catch {
      toast({
        title: "Error",
        description: "Failed to create payment link",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const paidPayments =
    estimate.payments?.filter((p: any) => p.status === "PAID") || [];
  const totalPaid = paidPayments.reduce(
    (sum: number, p: any) => sum + p.amount,
    0
  );

  const canCreateLink = [
    "ACCEPTED",
    "SENT",
    "VIEWED",
    "DEPOSIT_PAID",
  ].includes(estimate.status);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-4 bg-slate-50 rounded-lg space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Total Amount</span>
              <span className="font-semibold">{formatCurrency(estimate.totalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Deposit (50%)</span>
              <span className="font-semibold text-blue-600">
                {formatCurrency(estimate.depositAmount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Balance</span>
              <span className="font-semibold">{formatCurrency(estimate.balanceDue)}</span>
            </div>
            {totalPaid > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Total Paid</span>
                <span className="font-semibold">{formatCurrency(totalPaid)}</span>
              </div>
            )}
          </div>

          <Separator />

          <Button
            className="w-full"
            onClick={() => createPaymentLink("DEPOSIT")}
            disabled={loading || !canCreateLink}
          >
            {loading ? (
              <Loader2 className="mr-2 w-4 h-4 animate-spin" />
            ) : (
              <DollarSign className="mr-2 w-4 h-4" />
            )}
            Deposit Link — {formatCurrency(estimate.depositAmount)}
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => createPaymentLink("BALANCE")}
            disabled={loading}
          >
            Balance Link — {formatCurrency(estimate.balanceDue)}
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => createPaymentLink("FULL")}
            disabled={loading}
          >
            Full Payment — {formatCurrency(estimate.totalAmount)}
          </Button>

          {!canCreateLink && (
            <p className="text-xs text-slate-500 text-center">
              Estimate must be sent or accepted to generate payment links
            </p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Record Manual Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-500 font-medium">Payment Type</label>
                <Select
                  value={recordForm.type}
                  onValueChange={(v) => setRecordForm((f) => ({ ...f, type: v }))}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEPOSIT">Deposit</SelectItem>
                    <SelectItem value="BALANCE">Balance</SelectItem>
                    <SelectItem value="FULL">Full Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500 font-medium">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={recordForm.amount}
                    onChange={(e) => setRecordForm((f) => ({ ...f, amount: e.target.value }))}
                    className="h-8 pl-7 text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500 font-medium">Note (optional)</label>
              <Input
                placeholder="Check #, cash, Venmo..."
                value={recordForm.note}
                onChange={(e) => setRecordForm((f) => ({ ...f, note: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <Button
              size="sm"
              className="w-full"
              onClick={recordManualPayment}
              disabled={recording || !recordForm.amount}
            >
              {recording ? <Loader2 className="mr-2 w-3.5 h-3.5 animate-spin" /> : null}
              Record Payment
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment History</CardTitle>
          </CardHeader>
        <CardContent>
          {estimate.payments?.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No payments yet</p>
          ) : (
            <div className="space-y-3">
              {estimate.payments.map((p: any) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 border rounded-lg text-sm"
                >
                  <div>
                    <p className="font-medium capitalize">
                      {p.type.toLowerCase()} Payment
                    </p>
                    <p className="text-xs text-slate-500">{formatDate(p.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(p.amount)}</p>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full ${
                        p.status === "PAID"
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

function ActivityFeed({ estimateId }: { estimateId: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/estimates/${estimateId}/activity`)
      .then((r) => r.json())
      .then((d) => { setLogs(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [estimateId]);

  function actionLabel(action: string, meta: any) {
    if (action === "status_changed") {
      return `Status changed from ${ESTIMATE_STATUS_LABELS[meta?.from] || meta?.from} → ${ESTIMATE_STATUS_LABELS[meta?.to] || meta?.to}`;
    }
    if (action === "payment_recorded") {
      return `Payment recorded: ${meta?.type?.toLowerCase()} — $${Number(meta?.amount || 0).toFixed(2)}`;
    }
    return action.replace(/_/g, " ");
  }

  return (
    <Card>
      <CardHeader className="py-4">
        <CardTitle className="text-base">Activity Log</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">No activity recorded yet</p>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-slate-700">{actionLabel(log.action, log.metadata)}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                    {log.user?.name && <span>{log.user.name}</span>}
                    {log.user?.name && <span>·</span>}
                    <span>{formatDate(log.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
