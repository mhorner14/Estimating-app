"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Props {
  estimate: any;
  onUpdate: (data: any) => void;
}

export function JobCostsPanel({ estimate, onUpdate }: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    actualMaterialCost: String(estimate.actualMaterialCost ?? ""),
    actualLaborCost: String(estimate.actualLaborCost ?? ""),
    actualTotalCost: String(estimate.actualTotalCost ?? ""),
  });

  const matCost = parseFloat(form.actualMaterialCost) || 0;
  const labCost = parseFloat(form.actualLaborCost) || 0;
  const manualTotal = parseFloat(form.actualTotalCost) || 0;
  const computedTotal = form.actualTotalCost ? manualTotal : matCost + labCost;

  const totalAmount = Number(estimate.totalAmount);
  const actualMargin = computedTotal > 0 ? ((totalAmount - computedTotal) / totalAmount) * 100 : null;
  const estimatedMargin = Number(estimate.estimatedMargin);
  const marginDiff = actualMargin !== null ? actualMargin - estimatedMargin : null;

  async function save() {
    setSaving(true);
    try {
      const payload = {
        actualMaterialCost: matCost || null,
        actualLaborCost: labCost || null,
        actualTotalCost: computedTotal || null,
      };
      const res = await fetch(`/api/estimates/${estimate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      onUpdate(payload);
      toast({ title: "Job costs saved" });
    } catch {
      toast({ title: "Error", description: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Contract Price</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Actual Cost</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{computedTotal > 0 ? formatCurrency(computedTotal) : "—"}</p>
          </CardContent>
        </Card>
        <Card className={actualMargin !== null ? (actualMargin >= estimatedMargin ? "border-emerald-200" : "border-red-200") : ""}>
          <CardContent className="pt-5 text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Actual Margin</p>
            {actualMargin !== null ? (
              <>
                <p className={`text-2xl font-bold mt-1 ${actualMargin >= estimatedMargin ? "text-emerald-600" : "text-red-500"}`}>
                  {actualMargin.toFixed(1)}%
                </p>
                {marginDiff !== null && (
                  <div className={`flex items-center justify-center gap-1 text-xs mt-1 ${marginDiff >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {marginDiff >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {marginDiff >= 0 ? "+" : ""}{marginDiff.toFixed(1)}% vs estimate
                  </div>
                )}
              </>
            ) : (
              <p className="text-2xl font-bold text-slate-400 mt-1">—</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-slate-500" />
            Actual Job Costs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Material Cost</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <Input
                  type="number"
                  step="0.01"
                  value={form.actualMaterialCost}
                  onChange={(e) => setForm((f) => ({ ...f, actualMaterialCost: e.target.value }))}
                  className="pl-6"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Labor Cost</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <Input
                  type="number"
                  step="0.01"
                  value={form.actualLaborCost}
                  onChange={(e) => setForm((f) => ({ ...f, actualLaborCost: e.target.value }))}
                  className="pl-6"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Total Cost Override <span className="text-xs text-slate-400 font-normal">(leave blank to use material + labor)</span></Label>
            <div className="relative max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <Input
                type="number"
                step="0.01"
                value={form.actualTotalCost}
                onChange={(e) => setForm((f) => ({ ...f, actualTotalCost: e.target.value }))}
                className="pl-6"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <div className="text-sm text-slate-500">
              Estimated margin: <strong>{estimatedMargin.toFixed(1)}%</strong>
            </div>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              Save Costs
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
