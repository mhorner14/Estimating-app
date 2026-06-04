"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { DollarSign, TrendingUp, Target, BarChart3, Users, Award } from "lucide-react";

interface ReportData {
  summary: {
    totalCount: number;
    wonCount: number;
    lostCount: number;
    closeRate: number;
    totalWonRevenue: number;
    totalPending: number;
    avgMargin: number;
    avgJobSize: number;
  };
  monthly: Array<{
    month: string;
    label: string;
    created: number;
    won: number;
    wonRevenue: number;
    closeRate: number;
  }>;
  leadSourceData: Array<{ source: string; count: number; pct: number }>;
  statusCounts: Record<string, number>;
  statusRevenue: Record<string, number>;
}

const PERIOD_OPTIONS = [
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "180", label: "Last 6 months" },
  { value: "365", label: "Last year" },
];

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#94a3b8",
  NEEDS_CLARIFICATION: "#f97316",
  READY_FOR_REVIEW: "#8b5cf6",
  SENT: "#3b82f6",
  VIEWED: "#0ea5e9",
  ACCEPTED: "#10b981",
  DEPOSIT_PAID: "#059669",
  SCHEDULED: "#6366f1",
  IN_PROGRESS: "#8b5cf6",
  COMPLETED: "#10b981",
  BALANCE_DUE: "#f59e0b",
  PAID_IN_FULL: "#16a34a",
  LOST: "#ef4444",
};

function BarChart({ data, valueKey, labelKey, colorFn, formatValue }: {
  data: any[];
  valueKey: string;
  labelKey: string;
  colorFn?: (item: any) => string;
  formatValue?: (v: number) => string;
}) {
  const max = Math.max(...data.map((d) => d[valueKey]), 1);
  return (
    <div className="space-y-2">
      {data.map((item, i) => (
        <div key={i} className="flex items-center gap-3 text-sm">
          <div className="w-24 text-xs text-slate-600 shrink-0 truncate">{item[labelKey]}</div>
          <div className="flex-1 h-5 bg-slate-100 rounded overflow-hidden">
            <div
              className="h-full rounded transition-all"
              style={{
                width: `${(item[valueKey] / max) * 100}%`,
                backgroundColor: colorFn ? colorFn(item) : "#3b82f6",
              }}
            />
          </div>
          <div className="w-20 text-right text-xs font-medium text-slate-700 shrink-0">
            {formatValue ? formatValue(item[valueKey]) : item[valueKey]}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ReportsDashboard() {
  const [period, setPeriod] = useState("90");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports?period=${period}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [period]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 text-slate-300 animate-pulse" />
          <p className="text-sm">Loading reports...</p>
        </div>
      </div>
    );
  }

  const { summary, monthly, leadSourceData, statusCounts } = data;

  const maxRevenue = Math.max(...monthly.map((m) => m.wonRevenue), 1);

  const statusBreakdown = Object.entries(statusCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([status, count]) => ({ status, count }));

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Won Revenue</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(summary.totalWonRevenue)}</p>
                <p className="text-xs text-emerald-600 mt-0.5">{summary.wonCount} jobs won</p>
              </div>
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Close Rate</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{summary.closeRate}%</p>
                <p className="text-xs text-slate-400 mt-0.5">{summary.lostCount} lost</p>
              </div>
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Avg Job Size</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(summary.avgJobSize)}</p>
                <p className="text-xs text-slate-400 mt-0.5">{summary.totalCount} total estimates</p>
              </div>
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Avg Margin</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{summary.avgMargin}%</p>
                <p className="text-xs text-orange-500 mt-0.5">{formatCurrency(summary.totalPending)} pending</p>
              </div>
              <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                <Award className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly revenue chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Monthly Revenue (Won)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-40">
            {monthly.map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col justify-end" style={{ height: "120px" }}>
                  <div
                    className="w-full bg-emerald-500 rounded-t-sm min-h-[2px]"
                    style={{ height: `${(m.wonRevenue / maxRevenue) * 100}%` }}
                    title={formatCurrency(m.wonRevenue)}
                  />
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium text-slate-900">{formatCurrency(m.wonRevenue).replace("$", "$").replace(",000", "k")}</p>
                  <p className="text-xs text-slate-400">{m.label}</p>
                  <p className="text-xs text-blue-600">{m.closeRate}% close</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Lead Sources */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Lead Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leadSourceData.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No lead source data yet</p>
            ) : (
              <BarChart
                data={leadSourceData}
                valueKey="count"
                labelKey="source"
                formatValue={(v) => `${v} customers`}
              />
            )}
          </CardContent>
        </Card>

        {/* Estimate Status Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-600" />
              Estimates by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={statusBreakdown}
              valueKey="count"
              labelKey="status"
              colorFn={(item) => STATUS_COLORS[item.status] || "#94a3b8"}
              formatValue={(v) => `${v} est.`}
            />
          </CardContent>
        </Card>
      </div>

      {/* Monthly activity table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Monthly Activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase">Month</th>
                <th className="text-right p-4 text-xs font-medium text-slate-500 uppercase">Created</th>
                <th className="text-right p-4 text-xs font-medium text-slate-500 uppercase">Won</th>
                <th className="text-right p-4 text-xs font-medium text-slate-500 uppercase">Close Rate</th>
                <th className="text-right p-4 text-xs font-medium text-slate-500 uppercase">Won Revenue</th>
              </tr>
            </thead>
            <tbody>
              {monthly.map((m) => (
                <tr key={m.month} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="p-4 font-medium text-slate-900">{m.label}</td>
                  <td className="p-4 text-right text-slate-600">{m.created}</td>
                  <td className="p-4 text-right text-emerald-600 font-medium">{m.won}</td>
                  <td className="p-4 text-right">
                    <span className={`font-medium ${m.closeRate >= 50 ? "text-emerald-600" : m.closeRate >= 30 ? "text-orange-500" : "text-red-500"}`}>
                      {m.closeRate}%
                    </span>
                  </td>
                  <td className="p-4 text-right font-semibold text-slate-900">{formatCurrency(m.wonRevenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
