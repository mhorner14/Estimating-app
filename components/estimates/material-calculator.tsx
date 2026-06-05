"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator } from "lucide-react";

interface MaterialCalculatorProps {
  squareFootage?: number | null;
}

// Coverage rates in sqft per unit
const COATINGS = [
  { id: "epoxy_primer", name: "Epoxy Primer", coveragePerGallon: 250, unit: "gallons" },
  { id: "epoxy_base", name: "Epoxy Base Coat", coveragePerGallon: 200, unit: "gallons" },
  { id: "full_flake", name: "Decorative Flake", coveragePerLb: 100, coveragePerGallon: null, unit: "lbs" },
  { id: "polyaspartic", name: "Polyaspartic Top Coat", coveragePerGallon: 300, unit: "gallons" },
  { id: "clear_coat", name: "Clear Sealer", coveragePerGallon: 250, unit: "gallons" },
  { id: "crack_filler", name: "Crack Filler", coveragePer: 50, unit: "units (per 50 lf)" },
];

const WASTE_FACTOR = 0.15; // 15% waste

export function MaterialCalculator({ squareFootage }: MaterialCalculatorProps) {
  const [sqft, setSqft] = useState(squareFootage ? String(squareFootage) : "");
  const [coatCount, setCoatCount] = useState("2");

  const sf = parseFloat(sqft) || 0;
  const coats = parseInt(coatCount) || 1;
  const sfWithWaste = sf * (1 + WASTE_FACTOR);

  const materials = sf > 0 ? [
    { name: "Epoxy Primer", qty: Math.ceil(sfWithWaste / 250), unit: "gal" },
    { name: "Epoxy Base Coat", qty: Math.ceil((sfWithWaste * coats) / 200), unit: "gal" },
    { name: "Decorative Flake (full broadcast)", qty: Math.ceil(sfWithWaste / 100), unit: "lbs" },
    { name: "Polyaspartic Top Coat", qty: Math.ceil((sfWithWaste * coats) / 300), unit: "gal" },
    { name: "Primer Kit (200 sqft/kit)", qty: Math.ceil(sf / 200), unit: "kits" },
  ] : [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Calculator className="w-4 h-4 text-blue-600" />
          Material Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Square Footage</label>
            <Input
              type="number"
              placeholder="500"
              value={sqft}
              onChange={(e) => setSqft(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Coats</label>
            <Select value={coatCount} onValueChange={setCoatCount}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 coat</SelectItem>
                <SelectItem value="2">2 coats</SelectItem>
                <SelectItem value="3">3 coats</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {sf > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-slate-400 font-medium">Materials needed (incl. 15% waste):</p>
            {materials.map((m) => (
              <div key={m.name} className="flex items-center justify-between text-xs">
                <span className="text-slate-600">{m.name}</span>
                <span className="font-semibold text-slate-900">{m.qty} {m.unit}</span>
              </div>
            ))}
            <div className="border-t pt-1.5 mt-1.5">
              <p className="text-xs text-slate-400">Coverage area: {sf.toLocaleString()} sqft</p>
              <p className="text-xs text-slate-400">With waste: {Math.round(sfWithWaste).toLocaleString()} sqft</p>
            </div>
          </div>
        )}

        {!sf && (
          <p className="text-xs text-slate-400 text-center py-2">Enter square footage to calculate materials</p>
        )}
      </CardContent>
    </Card>
  );
}
