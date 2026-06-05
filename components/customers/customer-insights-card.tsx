"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, CheckCircle, AlertTriangle } from "lucide-react";

interface Props {
  customerId: string;
}

const TYPE_STYLES: Record<string, string> = {
  VIP: "bg-amber-100 text-amber-700",
  Active: "bg-emerald-100 text-emerald-700",
  Prospect: "bg-blue-100 text-blue-700",
  "At-Risk": "bg-orange-100 text-orange-700",
  Lost: "bg-red-100 text-red-700",
};

export function CustomerInsightsCard({ customerId }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/customers/${customerId}/insights`);
      if (!res.ok) throw new Error("Failed");
      setData(await res.json());
    } catch {
      setError("Unable to generate insights. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          AI Customer Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {!data && !loading && (
          <div className="text-center py-4">
            <p className="text-xs text-slate-400 mb-3">Get AI-powered insights about this customer</p>
            <Button size="sm" variant="outline" onClick={load} className="text-xs">
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
              Generate Insights
            </Button>
          </div>
        )}
        {loading && (
          <div className="flex items-center justify-center py-6 gap-2 text-slate-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Analyzing customer history...
          </div>
        )}
        {error && <p className="text-xs text-red-500 py-2">{error}</p>}
        {data && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              {data.customerType && (
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${TYPE_STYLES[data.customerType] || "bg-slate-100 text-slate-700"}`}>
                  {data.customerType}
                </span>
              )}
              <button onClick={load} className="text-xs text-slate-400 hover:text-slate-600 ml-auto">Refresh</button>
            </div>
            <p className="text-sm text-slate-700">{data.summary}</p>
            {data.insights?.length > 0 && (
              <ul className="space-y-1">
                {data.insights.map((insight: string, i: number) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    {insight}
                  </li>
                ))}
              </ul>
            )}
            {data.nextAction && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800 font-medium">{data.nextAction}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
