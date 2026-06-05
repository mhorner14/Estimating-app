"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

interface PricingInsightsProps {
  estimateId: string;
  totalAmount: number;
}

export function PricingInsights({ estimateId, totalAmount }: PricingInsightsProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/estimates/${estimateId}/pricing-insights`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [estimateId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-6 text-sm text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          Analyzing comparable jobs…
        </CardContent>
      </Card>
    );
  }

  if (!data || data.comparable?.wonCount === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-slate-400 text-center">
          Not enough comparable jobs yet to show pricing insights.
        </CardContent>
      </Card>
    );
  }

  const { comparable, analysis } = data;
  const positionConfig = {
    competitive: { icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50", label: "Competitively priced" },
    high: { icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50", label: "Priced above average" },
    low: { icon: TrendingDown, color: "text-blue-600", bg: "bg-blue-50", label: "Priced below average" },
    unknown: { icon: Minus, color: "text-slate-400", bg: "bg-slate-50", label: "No comparison available" },
  };

  const pos = positionConfig[analysis.pricePosition as keyof typeof positionConfig];
  const Icon = pos.icon;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          Pricing Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Position banner */}
        <div className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 ${pos.bg}`}>
          <Icon className={`w-4 h-4 shrink-0 ${pos.color}`} />
          <div>
            <p className={`text-sm font-medium ${pos.color}`}>{pos.label}</p>
            {analysis.priceDiffPct !== null && (
              <p className="text-xs text-slate-500">
                {Math.abs(analysis.priceDiffPct)}% {analysis.priceDiffPct > 0 ? "above" : "below"} your avg won job
              </p>
            )}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-0.5">Avg won job</p>
            <p className="text-sm font-semibold text-slate-900">
              {comparable.avgWonTotal ? formatCurrency(comparable.avgWonTotal) : "—"}
            </p>
            <p className="text-xs text-slate-400">{comparable.wonCount} jobs</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-0.5">Avg margin (won)</p>
            <p className="text-sm font-semibold text-slate-900">
              {comparable.avgWonMargin ? `${comparable.avgWonMargin.toFixed(1)}%` : "—"}
            </p>
            <p className="text-xs text-slate-400">{comparable.wonCount} jobs</p>
          </div>
          {comparable.avgWonPricePerSqft && (
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-0.5">Avg $/sqft (won)</p>
              <p className="text-sm font-semibold text-slate-900">
                ${comparable.avgWonPricePerSqft.toFixed(2)}
              </p>
            </div>
          )}
          {data.current.pricePerSqft && (
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-0.5">This job $/sqft</p>
              <p className="text-sm font-semibold text-slate-900">
                ${data.current.pricePerSqft.toFixed(2)}
              </p>
            </div>
          )}
        </div>

        {/* Suggested range */}
        {analysis.suggestedMin && analysis.suggestedMax && (
          <div className="border border-blue-200 rounded-lg p-3 bg-blue-50">
            <p className="text-xs font-medium text-blue-700 mb-0.5">Sweet spot range</p>
            <p className="text-sm font-semibold text-blue-900">
              {formatCurrency(analysis.suggestedMin)} – {formatCurrency(analysis.suggestedMax)}
            </p>
            <p className="text-xs text-blue-600 mt-0.5">Based on your {comparable.wonCount} similar won jobs</p>
          </div>
        )}

        {/* Top lost reason */}
        {analysis.topLostReason && comparable.lostCount > 0 && (
          <div className="flex items-start gap-2 text-xs text-slate-500 border-t pt-3">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
            <span>Top loss reason on similar jobs: <span className="font-medium text-slate-700">{analysis.topLostReason}</span></span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
