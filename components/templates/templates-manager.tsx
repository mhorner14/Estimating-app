"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2, FileText, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  unit: string;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  lineItems: LineItem[];
  notes: string | null;
  createdAt: string;
}

interface TemplatesManagerProps {
  services: Array<{ id: string; name: string; basePrice: number }>;
}

export function TemplatesManager({ services }: TemplatesManagerProps) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    notes: "",
    lineItems: [{ description: "", quantity: 1, unitPrice: 0, unit: "sqft" }] as LineItem[],
  });

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then(setTemplates)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function addLineItem() {
    setForm((f) => ({ ...f, lineItems: [...f.lineItems, { description: "", quantity: 1, unitPrice: 0, unit: "sqft" }] }));
  }

  function updateLineItem(i: number, field: string, value: string | number) {
    setForm((f) => {
      const items = [...f.lineItems];
      items[i] = { ...items[i], [field]: value };
      return { ...f, lineItems: items };
    });
  }

  function removeLineItem(i: number) {
    setForm((f) => ({ ...f, lineItems: f.lineItems.filter((_, idx) => idx !== i) }));
  }

  async function saveTemplate() {
    if (!form.name.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const t = await res.json();
      setTemplates((prev) => [t, ...prev]);
      setShowForm(false);
      setForm({ name: "", description: "", notes: "", lineItems: [{ description: "", quantity: 1, unitPrice: 0, unit: "sqft" }] });
      toast({ title: "Template saved" });
    } catch {
      toast({ title: "Error saving template", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Delete this template?")) return;
    try {
      await fetch(`/api/templates/${id}`, { method: "DELETE" });
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast({ title: "Template deleted" });
    } catch {
      toast({ title: "Error deleting template", variant: "destructive" });
    }
  }

  const templateTotal = (items: LineItem[]) => items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  if (loading) {
    return <div className="flex items-center gap-2 text-slate-400 py-8"><Loader2 className="w-4 h-4 animate-spin" />Loading templates…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">Estimate Templates</h3>
          <p className="text-sm text-slate-500">Save common job configurations to create estimates faster.</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-1.5" />New Template
        </Button>
      </div>

      {showForm && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="pt-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Template Name *</label>
                <Input
                  placeholder="e.g. Standard 2-Car Garage"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Description</label>
                <Input
                  placeholder="Short description"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-slate-600">Line Items</label>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={addLineItem}>
                  <Plus className="w-3 h-3 mr-1" />Add Row
                </Button>
              </div>
              <div className="space-y-2">
                {form.lineItems.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <Input
                      className="col-span-5 text-sm"
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateLineItem(i, "description", e.target.value)}
                    />
                    <Input
                      className="col-span-2 text-sm"
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(i, "quantity", parseFloat(e.target.value) || 0)}
                    />
                    <Input
                      className="col-span-2 text-sm"
                      placeholder="Unit"
                      value={item.unit}
                      onChange={(e) => updateLineItem(i, "unit", e.target.value)}
                    />
                    <Input
                      className="col-span-2 text-sm"
                      type="number"
                      placeholder="Price"
                      value={item.unitPrice}
                      onChange={(e) => updateLineItem(i, "unitPrice", parseFloat(e.target.value) || 0)}
                    />
                    <button onClick={() => removeLineItem(i)} className="col-span-1 text-slate-400 hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2 text-right">
                Estimated total: <span className="font-semibold">{formatCurrency(templateTotal(form.lineItems))}</span>
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Internal Notes</label>
              <Textarea
                placeholder="Notes for your team about this template..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="flex-1" onClick={saveTemplate} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}Save Template
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {templates.length === 0 ? (
        <div className="text-center py-12 text-slate-400 border-2 border-dashed rounded-xl">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No templates yet. Create one to speed up estimate creation.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <Card key={t.id} className="overflow-hidden">
              <div
                className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-slate-50"
                onClick={() => setExpanded(expanded === t.id ? null : t.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{t.name}</p>
                  {t.description && <p className="text-sm text-slate-500 truncate">{t.description}</p>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant="outline" className="text-xs">
                    {(t.lineItems as LineItem[]).length} items · {formatCurrency(templateTotal(t.lineItems as LineItem[]))}
                  </Badge>
                  {expanded === t.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </div>

              {expanded === t.id && (
                <div className="border-t px-5 py-4 space-y-4 bg-slate-50">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-slate-500 border-b">
                        <th className="text-left py-1.5">Description</th>
                        <th className="text-right py-1.5">Qty</th>
                        <th className="text-right py-1.5">Unit</th>
                        <th className="text-right py-1.5">Price</th>
                        <th className="text-right py-1.5">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(t.lineItems as LineItem[]).map((item, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-2 text-slate-700">{item.description}</td>
                          <td className="py-2 text-right text-slate-600">{item.quantity}</td>
                          <td className="py-2 text-right text-slate-600">{item.unit}</td>
                          <td className="py-2 text-right text-slate-600">{formatCurrency(item.unitPrice)}</td>
                          <td className="py-2 text-right font-medium">{formatCurrency(item.quantity * item.unitPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {t.notes && <p className="text-xs text-slate-500 italic">{t.notes}</p>}
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-500 border-red-200 hover:bg-red-50"
                      onClick={() => deleteTemplate(t.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />Delete
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
