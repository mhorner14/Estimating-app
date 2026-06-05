"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Mail, MapPin, Tag, Pencil, Loader2, Trash2, X, Link2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  projectAddress?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  leadSource?: string | null;
  tags?: string[];
  notes?: string | null;
}

export function CustomerContactCard({ customer: initial }: { customer: Customer }) {
  const { toast } = useToast();
  const router = useRouter();
  const [customer, setCustomer] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [portalLinking, setPortalLinking] = useState(false);
  const [portalCopied, setPortalCopied] = useState(false);
  const [form, setForm] = useState<Customer & { tags: string[] }>({ ...initial, tags: initial.tags ?? [] });
  const [tagInput, setTagInput] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function addTag(tag: string) {
    const t = tag.trim().toLowerCase();
    if (!t || form.tags.includes(t)) return;
    setForm((f) => ({ ...f, tags: [...f.tags, t] }));
    setTagInput("");
  }

  function removeTag(tag: string) {
    setForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== tag) }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setCustomer(updated);
      setEditing(false);
      toast({ title: "Customer updated" });
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function deleteCustomer() {
    if (!confirm(`Delete ${customer.name}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/customers/${customer.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast({ title: "Customer deleted" });
      router.push("/customers");
    } catch {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
      setDeleting(false);
    }
  }

  async function copyPortalLink() {
    setPortalLinking(true);
    try {
      const res = await fetch(`/api/customers/${customer.id}/portal-link`, { method: "POST" });
      const data = await res.json();
      await navigator.clipboard.writeText(data.url);
      setPortalCopied(true);
      toast({ title: "Portal link copied!", description: "Send this link to your customer." });
      setTimeout(() => setPortalCopied(false), 3000);
    } catch {
      toast({ title: "Error", description: "Failed to generate portal link", variant: "destructive" });
    } finally {
      setPortalLinking(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-slate-600">Contact Info</CardTitle>
        {!editing && (
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setForm({ ...customer, tags: customer.tags ?? [] }); setTagInput(""); setEditing(true); }}>
            <Pencil className="w-3 h-3 mr-1" /> Edit
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-500 font-medium">Name *</label>
              <Input name="name" value={form.name} onChange={handleChange} className="mt-1 h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium">Phone</label>
              <Input name="phone" value={form.phone || ""} onChange={handleChange} className="mt-1 h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium">Email</label>
              <Input name="email" type="email" value={form.email || ""} onChange={handleChange} className="mt-1 h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium">Project Address</label>
              <Input name="projectAddress" value={form.projectAddress || ""} onChange={handleChange} className="mt-1 h-8 text-sm" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-slate-500 font-medium">City</label>
                <Input name="city" value={form.city || ""} onChange={handleChange} className="mt-1 h-8 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500 font-medium">State</label>
                <Input name="state" value={form.state || ""} onChange={handleChange} className="mt-1 h-8 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500 font-medium">ZIP</label>
                <Input name="zip" value={form.zip || ""} onChange={handleChange} className="mt-1 h-8 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium">Lead Source</label>
              <Input name="leadSource" value={form.leadSource || ""} onChange={handleChange} placeholder="e.g. Google, Referral" className="mt-1 h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium">Tags</label>
              <div className="mt-1 flex flex-wrap gap-1.5 mb-1.5">
                {form.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-blue-900"><X className="w-2.5 h-2.5" /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); } }}
                  placeholder="Add tag, press Enter"
                  className="h-8 text-sm"
                />
                <Button size="sm" variant="outline" onClick={() => addTag(tagInput)} className="h-8 text-xs">Add</Button>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium">Notes</label>
              <Textarea name="notes" value={form.notes || ""} onChange={handleChange} rows={2} className="mt-1 text-sm" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <>
            {customer.phone && (
              <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-slate-700 hover:text-blue-600">
                <Phone className="w-4 h-4 text-slate-400" /> {customer.phone}
              </a>
            )}
            {customer.email && (
              <a href={`mailto:${customer.email}`} className="flex items-center gap-2 text-slate-700 hover:text-blue-600">
                <Mail className="w-4 h-4 text-slate-400" /> {customer.email}
              </a>
            )}
            {(customer.projectAddress || customer.city) && (
              <div className="flex items-start gap-2 text-slate-700">
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  {customer.projectAddress && <p>{customer.projectAddress}</p>}
                  {(customer.city || customer.state) && (
                    <p>{[customer.city, customer.state, customer.zip].filter(Boolean).join(", ")}</p>
                  )}
                </div>
              </div>
            )}
            {customer.leadSource && (
              <div className="flex items-center gap-2 text-slate-700">
                <Tag className="w-4 h-4 text-slate-400" /> {customer.leadSource}
              </div>
            )}
            {customer.tags && customer.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {customer.tags.map((tag) => (
                  <span key={tag} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">{tag}</span>
                ))}
              </div>
            )}
            {customer.notes && (
              <div className="pt-2 border-t">
                <p className="text-xs text-slate-500 font-medium mb-1">Notes</p>
                <p className="text-slate-600 text-xs">{customer.notes}</p>
              </div>
            )}
            <div className="pt-2 border-t flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-slate-600 hover:text-slate-800"
                onClick={copyPortalLink}
                disabled={portalLinking}
              >
                {portalLinking ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Link2 className="w-3 h-3 mr-1" />}
                {portalCopied ? "Copied!" : "Copy Portal Link"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-500 hover:text-red-600 hover:bg-red-50 h-7 text-xs ml-auto"
                onClick={deleteCustomer}
                disabled={deleting}
              >
                {deleting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Trash2 className="w-3 h-3 mr-1" />}
                Delete
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
