"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2, Shield, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WarrantyRule {
  id: string;
  name: string;
  condition: string;
  warrantyText: string;
  isDefault: boolean;
  sortOrder: number;
}

interface Props {
  rules: WarrantyRule[];
}

const emptyForm = { name: "", condition: "", warrantyText: "", isDefault: false, sortOrder: 0 };

export function WarrantyRulesManager({ rules: initial }: Props) {
  const { toast } = useToast();
  const [rules, setRules] = useState(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WarrantyRule | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(rule: WarrantyRule) {
    setEditing(rule);
    setForm({ name: rule.name, condition: rule.condition, warrantyText: rule.warrantyText, isDefault: rule.isDefault, sortOrder: rule.sortOrder });
    setOpen(true);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value }));
  }

  async function handleSave() {
    if (!form.name || !form.warrantyText) return;
    setLoading(true);
    try {
      if (editing) {
        const res = await fetch(`/api/warranty-rules/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error();
        const updated = await res.json();
        setRules((r) => r.map((x) => (x.id === editing.id ? updated : x)));
        toast({ title: "Warranty rule updated" });
      } else {
        const res = await fetch("/api/warranty-rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, sortOrder: rules.length }),
        });
        if (!res.ok) throw new Error();
        const created = await res.json();
        setRules((r) => [...r, created]);
        toast({ title: "Warranty rule created" });
      }
      setOpen(false);
    } catch {
      toast({ title: "Error", description: "Failed to save", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this warranty rule?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/warranty-rules/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setRules((r) => r.filter((x) => x.id !== id));
      toast({ title: "Warranty rule deleted" });
    } catch {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Warranty Rules</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Rules applied automatically by the AI when generating proposals
          </p>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Rule
        </Button>
      </div>

      {rules.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-lg text-slate-400">
          <Shield className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-sm">No warranty rules yet</p>
          <p className="text-xs mt-1">Add rules to automatically apply warranty language in proposals</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <Card key={rule.id} className="border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm text-slate-900">{rule.name}</p>
                      {rule.isDefault && (
                        <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Default
                        </span>
                      )}
                    </div>
                    {rule.condition && (
                      <p className="text-xs text-slate-500 mb-2">
                        <span className="font-medium">When:</span> {rule.condition}
                      </p>
                    )}
                    <p className="text-sm text-slate-600 line-clamp-2">{rule.warrantyText}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(rule)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(rule.id)}
                      disabled={deleting === rule.id}
                    >
                      {deleting === rule.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Warranty Rule" : "New Warranty Rule"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Rule Name *</Label>
              <Input name="name" value={form.name} onChange={handleChange} placeholder="e.g. Full Flake Polyaspartic Warranty" />
            </div>
            <div className="space-y-2">
              <Label>Condition (optional)</Label>
              <Input name="condition" value={form.condition} onChange={handleChange} placeholder="e.g. when service includes polyaspartic" />
              <p className="text-xs text-slate-500">Describes when this rule applies — used by AI to auto-select</p>
            </div>
            <div className="space-y-2">
              <Label>Warranty Text *</Label>
              <Textarea
                name="warrantyText"
                value={form.warrantyText}
                onChange={handleChange}
                rows={5}
                placeholder="Enter the full warranty language that will appear in the proposal..."
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                name="isDefault"
                checked={form.isDefault}
                onChange={handleChange}
              />
              <label htmlFor="isDefault" className="text-sm text-slate-600">
                Apply by default when no specific rule matches
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={loading || !form.name || !form.warrantyText}>
              {loading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
              {editing ? "Save Changes" : "Create Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
