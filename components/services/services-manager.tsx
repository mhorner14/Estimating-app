"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PlusCircle, Edit3, DollarSign, Loader2, ToggleLeft, ToggleRight, ArrowUp, ArrowDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Service } from "@prisma/client";

const SERVICE_CATEGORIES = [
  { value: "EPOXY_GARAGE", label: "Epoxy Garage" },
  { value: "POLYASPARTIC", label: "Polyaspartic" },
  { value: "FULL_FLAKE", label: "Full Flake System" },
  { value: "METALLIC_EPOXY", label: "Metallic Epoxy" },
  { value: "POLISHED_CONCRETE", label: "Polished Concrete" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "WATERPROOF_DECK", label: "Waterproof Deck" },
  { value: "VUBA_STONE", label: "Vuba Stone" },
  { value: "CONCRETE_REPAIR", label: "Concrete Repair" },
  { value: "CRACK_REPAIR", label: "Crack Repair" },
  { value: "STEM_WALL", label: "Stem Wall" },
  { value: "COATING_REMOVAL", label: "Coating Removal" },
  { value: "MOISTURE_MITIGATION", label: "Moisture Mitigation" },
  { value: "OTHER", label: "Other" },
];

const PRICING_TYPES = [
  { value: "PER_SQFT", label: "Per Sq Ft" },
  { value: "PER_LINEAR_FT", label: "Per Linear Ft" },
  { value: "FLAT_FEE", label: "Flat Fee" },
  { value: "HOURLY", label: "Hourly" },
  { value: "CUSTOM", label: "Custom" },
];

interface ServiceFormData {
  name: string;
  description: string;
  category: string;
  pricingType: string;
  basePrice: string;
  minCharge: string;
  materialCost: string;
  laborCost: string;
  marginTarget: string;
  defaultWarranty: string;
}

const defaultForm: ServiceFormData = {
  name: "",
  description: "",
  category: "EPOXY_GARAGE",
  pricingType: "PER_SQFT",
  basePrice: "",
  minCharge: "",
  materialCost: "",
  laborCost: "",
  marginTarget: "40",
  defaultWarranty: "",
};

interface Props {
  services: Service[];
  companyId: string;
}

export function ServicesManager({ services: initialServices, companyId }: Props) {
  const { toast } = useToast();
  const [services, setServices] = useState(initialServices);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceFormData>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [bulkAdjOpen, setBulkAdjOpen] = useState(false);
  const [bulkPct, setBulkPct] = useState("");
  const [bulkAdjusting, setBulkAdjusting] = useState(false);

  function openNew() {
    setEditingService(null);
    setForm(defaultForm);
    setDialogOpen(true);
  }

  function openEdit(service: Service) {
    setEditingService(service);
    setForm({
      name: service.name,
      description: service.description || "",
      category: service.category,
      pricingType: service.pricingType,
      basePrice: service.basePrice.toString(),
      minCharge: service.minCharge.toString(),
      materialCost: service.materialCost?.toString() || "",
      laborCost: service.laborCost?.toString() || "",
      marginTarget: service.marginTarget?.toString() || "40",
      defaultWarranty: service.defaultWarranty || "",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        category: form.category,
        pricingType: form.pricingType,
        basePrice: parseFloat(form.basePrice),
        minCharge: parseFloat(form.minCharge) || 0,
        materialCost: form.materialCost ? parseFloat(form.materialCost) : null,
        laborCost: form.laborCost ? parseFloat(form.laborCost) : null,
        marginTarget: parseFloat(form.marginTarget) || 40,
        defaultWarranty: form.defaultWarranty,
        companyId,
      };

      const url = editingService ? `/api/services/${editingService.id}` : "/api/services";
      const method = editingService ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save");
      const saved = await res.json();

      if (editingService) {
        setServices((s) => s.map((x) => (x.id === saved.id ? saved : x)));
      } else {
        setServices((s) => [...s, saved]);
      }

      setDialogOpen(false);
      toast({ title: editingService ? "Service updated" : "Service created" });
    } catch {
      toast({ title: "Error", description: "Failed to save service", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function moveService(index: number, direction: "up" | "down") {
    const newServices = [...services];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newServices.length) return;

    [newServices[index], newServices[targetIndex]] = [newServices[targetIndex], newServices[index]];
    const updated = newServices.map((s, i) => ({ ...s, sortOrder: i }));
    setServices(updated);

    await Promise.all(
      [updated[index], updated[targetIndex]].map((s) =>
        fetch(`/api/services/${s.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: s.sortOrder }),
        })
      )
    );
  }

  async function toggleActive(service: Service) {
    const res = await fetch(`/api/services/${service.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !service.isActive }),
    });
    if (res.ok) {
      const updated = await res.json();
      setServices((s) => s.map((x) => (x.id === updated.id ? updated : x)));
    }
  }

  async function applyBulkAdjustment() {
    const pct = parseFloat(bulkPct);
    if (isNaN(pct) || pct === 0) return;
    setBulkAdjusting(true);
    try {
      const multiplier = 1 + pct / 100;
      const updated = await Promise.all(
        services.filter((s) => s.isActive).map(async (s) => {
          const newPrice = Math.round(Number(s.basePrice) * multiplier * 100) / 100;
          const res = await fetch(`/api/services/${s.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ basePrice: newPrice }),
          });
          return res.ok ? { ...s, basePrice: newPrice } : s;
        })
      );
      setServices((prev) => prev.map((s) => {
        const u = updated.find((x) => x.id === s.id);
        return u || s;
      }));
      toast({ title: `Prices ${pct > 0 ? "increased" : "decreased"} by ${Math.abs(pct)}%` });
      setBulkAdjOpen(false);
      setBulkPct("");
    } catch {
      toast({ title: "Error", description: "Failed to update prices", variant: "destructive" });
    } finally {
      setBulkAdjusting(false);
    }
  }

  const categoryLabel = (cat: string) => SERVICE_CATEGORIES.find((c) => c.value === cat)?.label || cat;
  const pricingLabel = (type: string) => PRICING_TYPES.find((t) => t.value === type)?.label || type;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-slate-500">{services.length} services configured</p>
        <div className="flex gap-2">
          {services.length > 0 && (
            <Button variant="outline" onClick={() => setBulkAdjOpen(true)}>
              <DollarSign className="w-4 h-4 mr-2" /> Adjust All Prices
            </Button>
          )}
          <Button onClick={openNew}>
            <PlusCircle className="w-4 h-4 mr-2" /> Add Service
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {services.map((service, index) => (
          <Card key={service.id} className={`${!service.isActive ? "opacity-60" : ""}`}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{service.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">{categoryLabel(service.category)}</Badge>
                    <Badge variant="secondary" className="text-xs">{pricingLabel(service.pricingType)}</Badge>
                  </div>
                </div>
                <div className="flex gap-1 ml-2">
                  <div className="flex flex-col">
                    <Button size="sm" variant="ghost" className="h-5 px-1" onClick={() => moveService(index, "up")} disabled={index === 0}>
                      <ArrowUp className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-5 px-1" onClick={() => moveService(index, "down")} disabled={index === services.length - 1}>
                      <ArrowDown className="w-3 h-3" />
                    </Button>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(service)}>
                    <Edit3 className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleActive(service)}>
                    {service.isActive ? (
                      <ToggleRight className="w-4 h-4 text-green-600" />
                    ) : (
                      <ToggleLeft className="w-4 h-4 text-slate-400" />
                    )}
                  </Button>
                </div>
              </div>

              {service.description && (
                <p className="text-xs text-slate-500 mb-3 line-clamp-2">{service.description}</p>
              )}

              <div className="flex items-center gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Base Price</p>
                  <p className="font-semibold text-green-700">
                    {formatCurrency(service.basePrice)}
                    {service.pricingType === "PER_SQFT" && "/sqft"}
                    {service.pricingType === "PER_LINEAR_FT" && "/lft"}
                    {service.pricingType === "HOURLY" && "/hr"}
                  </p>
                </div>
                {service.minCharge > 0 && (
                  <div>
                    <p className="text-xs text-slate-500">Min</p>
                    <p className="font-medium">{formatCurrency(service.minCharge)}</p>
                  </div>
                )}
                {service.marginTarget && (
                  <div>
                    <p className="text-xs text-slate-500">Target Margin</p>
                    <p className="font-medium">{service.marginTarget}%</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {services.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <DollarSign className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="font-medium">No services configured</p>
          <p className="text-sm mt-1 mb-4">Add your services and pricing so the AI can generate accurate estimates</p>
          <Button onClick={openNew}>Add First Service</Button>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingService ? "Edit Service" : "Add Service"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-2">
              <Label>Service Name *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Full Flake Polyaspartic System" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SERVICE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Pricing Type</Label>
              <Select value={form.pricingType} onValueChange={(v) => setForm((f) => ({ ...f, pricingType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRICING_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Base Price *</Label>
              <Input type="number" step="0.01" value={form.basePrice} onChange={(e) => setForm((f) => ({ ...f, basePrice: e.target.value }))} placeholder="3.50" />
            </div>
            <div className="space-y-2">
              <Label>Minimum Charge</Label>
              <Input type="number" step="0.01" value={form.minCharge} onChange={(e) => setForm((f) => ({ ...f, minCharge: e.target.value }))} placeholder="500" />
            </div>
            <div className="space-y-2">
              <Label>Material Cost</Label>
              <Input type="number" step="0.01" value={form.materialCost} onChange={(e) => setForm((f) => ({ ...f, materialCost: e.target.value }))} placeholder="1.20" />
            </div>
            <div className="space-y-2">
              <Label>Labor Cost</Label>
              <Input type="number" step="0.01" value={form.laborCost} onChange={(e) => setForm((f) => ({ ...f, laborCost: e.target.value }))} placeholder="0.80" />
            </div>
            <div className="space-y-2">
              <Label>Target Margin %</Label>
              <Input type="number" value={form.marginTarget} onChange={(e) => setForm((f) => ({ ...f, marginTarget: e.target.value }))} placeholder="40" />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="What's included in this service..." rows={3} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Default Warranty Language</Label>
              <Textarea value={form.defaultWarranty} onChange={(e) => setForm((f) => ({ ...f, defaultWarranty: e.target.value }))} placeholder="Warranty terms for this service..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={loading || !form.name || !form.basePrice}>
              {loading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
              {editingService ? "Save Changes" : "Add Service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk price adjustment dialog */}
      <Dialog open={bulkAdjOpen} onOpenChange={setBulkAdjOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adjust All Prices</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-slate-600">
              Adjust base prices for all active services by a percentage. Use a negative number to decrease prices.
            </p>
            <div className="space-y-2">
              <Label>Percentage Change</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={bulkPct}
                  onChange={(e) => setBulkPct(e.target.value)}
                  placeholder="e.g. 5 for +5%"
                  step="0.5"
                />
                <span className="text-slate-500 font-medium">%</span>
              </div>
            </div>
            {bulkPct && !isNaN(parseFloat(bulkPct)) && (
              <div className="bg-slate-50 rounded-lg p-3 text-sm">
                <p className="font-medium text-slate-700">Preview</p>
                {services.filter((s) => s.isActive).slice(0, 3).map((s) => {
                  const newPrice = Math.round(Number(s.basePrice) * (1 + parseFloat(bulkPct) / 100) * 100) / 100;
                  return (
                    <p key={s.id} className="text-slate-500 text-xs mt-1">
                      {s.name}: ${Number(s.basePrice).toFixed(2)} → ${newPrice.toFixed(2)}
                    </p>
                  );
                })}
                {services.filter((s) => s.isActive).length > 3 && (
                  <p className="text-xs text-slate-400 mt-1">and {services.filter((s) => s.isActive).length - 3} more...</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkAdjOpen(false)}>Cancel</Button>
            <Button
              onClick={applyBulkAdjustment}
              disabled={bulkAdjusting || !bulkPct || isNaN(parseFloat(bulkPct)) || parseFloat(bulkPct) === 0}
            >
              {bulkAdjusting && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
              Apply to {services.filter((s) => s.isActive).length} Services
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
