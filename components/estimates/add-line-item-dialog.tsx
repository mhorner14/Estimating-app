"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AddLineItemDialogProps {
  estimateId: string;
  services: any[];
  open: boolean;
  onClose: () => void;
  onAdded: (updatedEstimate: any) => void;
}

export function AddLineItemDialog({
  estimateId,
  services,
  open,
  onClose,
  onAdded,
}: AddLineItemDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    description: "",
    quantity: "1",
    unit: "job",
    unitPrice: "",
    serviceId: "",
    isOptional: false,
  });

  function handleServiceSelect(serviceId: string) {
    const service = services.find((s) => s.id === serviceId);
    if (!service) return;
    setForm((f) => ({
      ...f,
      serviceId,
      description: service.name,
      unitPrice: service.basePrice.toString(),
      unit:
        service.pricingType === "PER_SQFT"
          ? "sq ft"
          : service.pricingType === "PER_LINEAR_FT"
          ? "linear ft"
          : "job",
    }));
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleAdd() {
    if (!form.description || !form.unitPrice) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/estimates/${estimateId}/line-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to add");
      const updated = await res.json();
      onAdded(updated);
      onClose();
      setForm({ description: "", quantity: "1", unit: "job", unitPrice: "", serviceId: "", isOptional: false });
      toast({ title: "Line item added" });
    } catch {
      toast({ title: "Error", description: "Failed to add line item", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const total =
    parseFloat(form.quantity || "0") * parseFloat(form.unitPrice || "0");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Line Item</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>From Service Catalog (optional)</Label>
            <Select onValueChange={handleServiceSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a service to pre-fill..." />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Description *</Label>
            <Input
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Crack repair — 3 cracks"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                name="quantity"
                type="number"
                step="0.01"
                value={form.quantity}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Input
                name="unit"
                value={form.unit}
                onChange={handleChange}
                placeholder="sq ft"
              />
            </div>
            <div className="space-y-2">
              <Label>Unit Price</Label>
              <Input
                name="unitPrice"
                type="number"
                step="0.01"
                value={form.unitPrice}
                onChange={handleChange}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isOptional"
              name="isOptional"
              checked={form.isOptional}
              onChange={handleChange}
            />
            <label htmlFor="isOptional" className="text-sm text-slate-600">
              Mark as optional (shown in proposal but not counted in total)
            </label>
          </div>

          {total > 0 && (
            <div className="p-3 bg-slate-50 rounded-lg text-sm font-medium text-right">
              Line total: ${total.toFixed(2)}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleAdd}
            disabled={loading || !form.description || !form.unitPrice}
          >
            {loading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
            Add Line Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
