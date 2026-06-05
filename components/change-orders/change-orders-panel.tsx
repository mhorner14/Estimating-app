"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Send, CheckCircle, Clock, XCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface ChangeOrder {
  id: string;
  number: string;
  description: string;
  amount: number;
  status: string;
  sentAt: string | null;
  approvedAt: string | null;
  lineItems: Array<{ description: string; totalPrice: number }>;
  createdAt: string;
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  PENDING: <Clock className="w-3.5 h-3.5 text-amber-500" />,
  APPROVED: <CheckCircle className="w-3.5 h-3.5 text-green-500" />,
  REJECTED: <XCircle className="w-3.5 h-3.5 text-red-500" />,
};

export function ChangeOrdersPanel({ estimateId }: { estimateId: string }) {
  const { toast } = useToast();
  const [orders, setOrders] = useState<ChangeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [form, setForm] = useState({ description: "", amount: "" });

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(`/api/estimates/${estimateId}/change-orders`);
      setOrders(await res.json());
    } catch {
      toast({ title: "Failed to load change orders", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [estimateId, toast]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch(`/api/estimates/${estimateId}/change-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: form.description, amount: parseFloat(form.amount) || 0 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setOrders((prev) => [data, ...prev]);
      setForm({ description: "", amount: "" });
      toast({ title: "Change order created" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  }

  async function handleSend(coId: string) {
    setSendingId(coId);
    try {
      const res = await fetch(`/api/estimates/${estimateId}/change-orders/${coId}/send`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to send");
      setOrders((prev) => prev.map((o) => o.id === coId ? { ...o, sentAt: new Date().toISOString() } : o));
      toast({ title: "Change order sent to customer" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSendingId(null);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Plus className="w-4 h-4" /> New Change Order</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Additional concrete sealer on back patio — customer requested upgrade..."
                rows={3}
                required
              />
            </div>
            <div className="space-y-1.5 max-w-xs">
              <Label>Additional Amount ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="250.00"
              />
            </div>
            <Button type="submit" disabled={creating || !form.description}>
              {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Create Change Order
            </Button>
          </form>
        </CardContent>
      </Card>

      {orders.length === 0 ? (
        <div className="text-center py-8 text-slate-500 border border-dashed border-slate-200 rounded-lg">
          <p className="text-sm">No change orders yet</p>
          <p className="text-xs text-slate-400 mt-1">Create one above to document scope changes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((co) => (
            <Card key={co.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {STATUS_ICONS[co.status] || STATUS_ICONS.PENDING}
                    <span className="font-semibold text-sm">{co.number}</span>
                    <span className="text-xs text-slate-500 capitalize">{co.status.toLowerCase()}</span>
                    {co.sentAt && !co.approvedAt && <span className="text-xs text-blue-600">· Sent for approval</span>}
                    {co.approvedAt && <span className="text-xs text-green-600">· Approved</span>}
                  </div>
                  <p className="font-bold text-blue-700">{formatCurrency(co.amount)}</p>
                </div>
                <p className="text-sm text-slate-600 whitespace-pre-wrap mb-3">{co.description}</p>
                {co.status === "PENDING" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSend(co.id)}
                    disabled={sendingId === co.id}
                  >
                    {sendingId === co.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    ) : (
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    {co.sentAt ? "Resend to Customer" : "Send to Customer"}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
