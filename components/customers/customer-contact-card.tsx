"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Mail, MapPin, Tag, Pencil, Loader2, Trash2 } from "lucide-react";
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
  notes?: string | null;
}

export function CustomerContactCard({ customer: initial }: { customer: Customer }) {
  const { toast } = useToast();
  const router = useRouter();
  const [customer, setCustomer] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ ...initial });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
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

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-slate-600">Contact Info</CardTitle>
        {!editing && (
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setForm({ ...customer }); setEditing(true); }}>
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
            {customer.notes && (
              <div className="pt-2 border-t">
                <p className="text-xs text-slate-500 font-medium mb-1">Notes</p>
                <p className="text-slate-600 text-xs">{customer.notes}</p>
              </div>
            )}
            <div className="pt-2 border-t">
              <Button
                size="sm"
                variant="ghost"
                className="text-red-500 hover:text-red-600 hover:bg-red-50 h-7 text-xs"
                onClick={deleteCustomer}
                disabled={deleting}
              >
                {deleting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Trash2 className="w-3 h-3 mr-1" />}
                Delete Customer
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
