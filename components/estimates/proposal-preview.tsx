"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Loader2, Building2, MapPin, Phone, Mail, Pencil, Save, X } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface ProposalPreviewProps {
  estimate: any;
  onGenerate: () => void;
  generating: boolean;
}

const EDITABLE_FIELDS = [
  { key: "proposalTitle", label: "Proposal Title", multiline: false },
  { key: "scopeOfWork", label: "Scope of Work", multiline: true },
  { key: "prepSteps", label: "Surface Preparation", multiline: true },
  { key: "productsIncluded", label: "System & Products", multiline: true },
  { key: "colorSelection", label: "Color Selection", multiline: false },
  { key: "warrantyText", label: "Warranty", multiline: true },
  { key: "exclusions", label: "Exclusions", multiline: true },
] as const;

type EditableKey = typeof EDITABLE_FIELDS[number]["key"];

function EditableSection({
  label,
  value,
  fieldKey,
  multiline,
  onSave,
}: {
  label: string;
  value: string;
  fieldKey: EditableKey;
  multiline: boolean;
  onSave: (key: EditableKey, val: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await onSave(fieldKey, draft);
    setSaving(false);
    setEditing(false);
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  if (!value && !editing) return null;

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{label}</h3>
        {!editing && (
          <button
            onClick={() => { setDraft(value); setEditing(true); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
          >
            <Pencil className="w-3 h-3" /> Edit
          </button>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          {multiline ? (
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={5}
              className="text-sm"
              autoFocus
            />
          ) : (
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="text-sm"
              autoFocus
            />
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Save className="w-3 h-3 mr-1" /> Save</>}
            </Button>
            <Button size="sm" variant="ghost" onClick={cancel}>
              <X className="w-3 h-3 mr-1" /> Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{value}</p>
      )}
    </div>
  );
}

export function ProposalPreview({ estimate: initialEstimate, onGenerate, generating }: ProposalPreviewProps) {
  const { toast } = useToast();
  const [estimate, setEstimate] = useState(initialEstimate);
  const [improving, setImproving] = useState(false);

  async function improveWithAI() {
    setImproving(true);
    try {
      const res = await fetch(`/api/estimates/${estimate.id}/improve-proposal`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setEstimate((e: any) => ({ ...e, ...data }));
      toast({ title: "Proposal improved!", description: `${data.improvements?.length || 0} improvements applied.` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setImproving(false);
    }
  }

  const handleSave = useCallback(async (key: EditableKey, value: string) => {
    try {
      const res = await fetch(`/api/estimates/${estimate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      if (!res.ok) throw new Error();
      setEstimate((e: any) => ({ ...e, [key]: value }));
      toast({ title: "Saved" });
    } catch {
      toast({ title: "Error", description: "Failed to save", variant: "destructive" });
      throw new Error("save failed");
    }
  }, [estimate.id, toast]);

  if (!estimate.scopeOfWork) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Ready to generate your proposal?</h3>
        <p className="text-slate-500 text-sm max-w-md mb-6">
          The AI will write a professional, premium proposal based on your estimate details.
          Takes about 10 seconds.
        </p>
        <Button onClick={onGenerate} disabled={generating} size="lg">
          {generating ? (
            <><Loader2 className="mr-2 w-4 h-4 animate-spin" /> Generating...</>
          ) : (
            <><Sparkles className="mr-2 w-4 h-4" /> Generate Proposal</>
          )}
        </Button>
      </div>
    );
  }

  const company = estimate.company;
  const customer = estimate.project.customer;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-slate-400">Hover over any section to edit it inline</p>
        <Button size="sm" variant="outline" onClick={improveWithAI} disabled={improving} className="text-xs h-7">
          {improving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
          Improve with AI
        </Button>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white p-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold">{company?.name}</p>
                  {company?.licenseNumber && (
                    <p className="text-slate-400 text-sm">License #{company.licenseNumber}</p>
                  )}
                </div>
              </div>
              <div className="space-y-1 text-sm text-slate-300">
                {company?.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5" /> {company.phone}
                  </div>
                )}
                {company?.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5" /> {company.email}
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-slate-400 text-sm">Proposal #</p>
              <p className="text-xl font-bold">{estimate.estimateNumber}</p>
              <p className="text-slate-400 text-sm mt-2">Date</p>
              <p className="text-sm">{formatDate(estimate.createdAt)}</p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-6 p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Prepared For</p>
              <p className="font-semibold text-slate-900">{customer.name}</p>
              {customer.email && <p className="text-sm text-slate-600">{customer.email}</p>}
              {customer.phone && <p className="text-sm text-slate-600">{customer.phone}</p>}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Project Location</p>
              <div className="flex items-start gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500 mt-0.5" />
                <p className="text-sm text-slate-700">{customer.projectAddress || estimate.project.address || "Address on file"}</p>
              </div>
            </div>
          </div>

          {/* Title */}
          {estimate.proposalTitle && (
            <div className="group">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">{estimate.proposalTitle}</h2>
              </div>
            </div>
          )}

          {EDITABLE_FIELDS.slice(0, 5).map((field) => (
            estimate[field.key] ? (
              <EditableSection
                key={field.key}
                label={field.label}
                value={estimate[field.key]}
                fieldKey={field.key}
                multiline={field.multiline}
                onSave={handleSave}
              />
            ) : null
          ))}

          <Separator />

          {/* Pricing Table */}
          <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Investment Summary</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 font-semibold text-slate-700">Description</th>
                  <th className="text-right py-2 font-semibold text-slate-700">Qty</th>
                  <th className="text-right py-2 font-semibold text-slate-700">Unit Price</th>
                  <th className="text-right py-2 font-semibold text-slate-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {estimate.lineItems
                  .filter((item: any) => !item.isOptional)
                  .map((item: any) => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="py-3 text-slate-700">{item.description}</td>
                      <td className="py-3 text-right text-slate-600">
                        {Number(item.quantity).toLocaleString()} {item.unit}
                      </td>
                      <td className="py-3 text-right text-slate-600">{formatCurrency(Number(item.unitPrice))}</td>
                      <td className="py-3 text-right font-medium">{formatCurrency(Number(item.totalPrice))}</td>
                    </tr>
                  ))}
              </tbody>
            </table>

            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Subtotal</span>
                <span>{formatCurrency(Number(estimate.subtotal))}</span>
              </div>
              {Number(estimate.discountAmount) > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(Number(estimate.discountAmount))}</span>
                </div>
              )}
              {Number(estimate.taxAmount) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Tax</span>
                  <span>{formatCurrency(Number(estimate.taxAmount))}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total Investment</span>
                <span>{formatCurrency(Number(estimate.totalAmount))}</span>
              </div>
            </div>
          </div>

          {estimate.lineItems.filter((i: any) => i.isOptional).length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Optional Add-ons</h3>
                <table className="w-full text-sm">
                  <tbody>
                    {estimate.lineItems
                      .filter((item: any) => item.isOptional)
                      .map((item: any) => (
                        <tr key={item.id} className="border-b border-slate-100">
                          <td className="py-3 text-slate-600 italic">{item.description}</td>
                          <td className="py-3 text-right text-slate-500">{Number(item.quantity).toLocaleString()} {item.unit}</td>
                          <td className="py-3 text-right font-medium text-slate-600">{formatCurrency(Number(item.totalPrice))}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <Separator />

          {/* Payment Terms */}
          <div className="grid grid-cols-2 gap-4 p-4 border border-blue-100 bg-blue-50 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-1">Deposit Due</p>
              <p className="text-2xl font-bold text-blue-700">{formatCurrency(Number(estimate.depositAmount))}</p>
              <p className="text-xs text-blue-600 mt-1">Due upon acceptance</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-600 font-semibold uppercase tracking-wide mb-1">Balance Due</p>
              <p className="text-2xl font-bold text-slate-700">{formatCurrency(Number(estimate.balanceDue))}</p>
              <p className="text-xs text-slate-600 mt-1">Due upon completion</p>
            </div>
          </div>

          {/* Warranty + Exclusions */}
          {[EDITABLE_FIELDS[5], EDITABLE_FIELDS[6]].map((field) => (
            estimate[field.key] ? (
              <EditableSection
                key={field.key}
                label={field.label}
                value={estimate[field.key]}
                fieldKey={field.key}
                multiline={field.multiline}
                onSave={handleSave}
              />
            ) : null
          ))}

          {/* Signature Block */}
          {estimate.signature ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Digitally Signed
              </div>
              <p className="text-sm text-green-700">
                Signed by <strong>{estimate.signature.signerName}</strong> on{" "}
                {formatDate(estimate.signature.signedAt)}
              </p>
            </div>
          ) : (
            <div className="border-t-2 border-dashed border-slate-300 pt-6 mt-6">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-xs text-slate-500 mb-4">Customer Signature</p>
                  <div className="h-12 border-b border-slate-300" />
                  <p className="text-xs text-slate-500 mt-1">Signature</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-4">Date</p>
                  <div className="h-12 border-b border-slate-300" />
                  <p className="text-xs text-slate-500 mt-1">Date</p>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          {company?.defaultTerms && (
            <div className="text-xs text-slate-400 leading-relaxed border-t pt-4">
              {company.defaultTerms}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
