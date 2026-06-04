"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Zap } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Service {
  id: string;
  name: string;
  basePrice: number;
  pricingType: string;
  minCharge: number;
}

interface Customer {
  id: string;
  name: string;
}

interface Props {
  services: Service[];
  customers: Customer[];
}

export function QuickEstimatePanel({ services, customers }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [customerId, setCustomerId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [creating, setCreating] = useState(false);

  const selectedService = services.find((s) => s.id === serviceId);
  const qty = parseFloat(quantity) || 0;

  const estimated = selectedService && qty > 0
    ? Math.max(selectedService.basePrice * qty, selectedService.minCharge)
    : null;

  async function handleCreate() {
    if (!customerId || !serviceId || !qty) return;
    setCreating(true);
    try {
      const res = await fetch("/api/estimates/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, serviceId, quantity: qty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create");
      toast({ title: "Quick estimate created!" });
      router.push(`/estimates/${data.id}`);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
      setCreating(false);
    }
  }

  const perSqftServices = services.filter((s) => s.pricingType === "PER_SQFT");
  const otherServices = services.filter((s) => s.pricingType !== "PER_SQFT");

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-blue-700">
          <Zap className="w-4 h-4" /> Quick Estimate
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs">Customer</Label>
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger className="h-8 text-sm mt-1">
              <SelectValue placeholder="Select customer..." />
            </SelectTrigger>
            <SelectContent>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">Service</Label>
          <Select value={serviceId} onValueChange={setServiceId}>
            <SelectTrigger className="h-8 text-sm mt-1">
              <SelectValue placeholder="Select service..." />
            </SelectTrigger>
            <SelectContent>
              {perSqftServices.length > 0 && (
                <>
                  <div className="px-2 py-1 text-xs font-semibold text-slate-400">Per Sq Ft</div>
                  {perSqftServices.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name} (${s.basePrice}/sqft)</SelectItem>
                  ))}
                </>
              )}
              {otherServices.length > 0 && (
                <>
                  <div className="px-2 py-1 text-xs font-semibold text-slate-400">Other</div>
                  {otherServices.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        {selectedService && (
          <div>
            <Label className="text-xs">
              {selectedService.pricingType === "PER_SQFT" ? "Square Footage" :
               selectedService.pricingType === "PER_LINEAR_FT" ? "Linear Footage" :
               selectedService.pricingType === "HOURLY" ? "Hours" : "Quantity"}
            </Label>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              className="h-8 text-sm mt-1"
            />
          </div>
        )}

        {estimated !== null && (
          <div className="bg-white rounded-lg border border-blue-200 p-3 text-center">
            <p className="text-xs text-slate-500">Estimated Total</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(estimated)}</p>
            {selectedService && selectedService.minCharge > 0 && qty * selectedService.basePrice < selectedService.minCharge && (
              <p className="text-xs text-amber-600 mt-0.5">Minimum charge applied</p>
            )}
          </div>
        )}

        <Button
          className="w-full h-8 text-sm"
          onClick={handleCreate}
          disabled={!customerId || !serviceId || !qty || creating}
        >
          {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Zap className="w-3.5 h-3.5 mr-1.5" />}
          Create Estimate
        </Button>
      </CardContent>
    </Card>
  );
}
