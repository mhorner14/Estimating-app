"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Search, X, Download, Clock, Mail, CheckSquare, Square, Loader2 } from "lucide-react";
import { formatCurrency, formatDate, ESTIMATE_STATUS_LABELS, ESTIMATE_STATUS_COLORS } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Estimate {
  id: string;
  estimateNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  sentAt?: string | null;
  project: {
    customer: {
      name: string;
      phone?: string | null;
    };
  };
}

interface EstimatesTableProps {
  estimates: Estimate[];
}

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "AI_PROCESSING", label: "AI Processing" },
  { value: "PENDING_REVIEW", label: "Pending Review" },
  { value: "READY_FOR_REVIEW", label: "Ready for Review" },
  { value: "SENT", label: "Sent" },
  { value: "VIEWED", label: "Viewed" },
  { value: "FOLLOW_UP", label: "Follow Up" },
  { value: "NEGOTIATING", label: "Negotiating" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "DECLINED", label: "Declined" },
  { value: "EXPIRED", label: "Expired" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "CANCELLED", label: "Cancelled" },
];

const ALL_STATUSES = [
  "DRAFT","NEEDS_CLARIFICATION","READY_FOR_REVIEW","SENT","VIEWED",
  "ACCEPTED","DEPOSIT_PAID","SCHEDULED","IN_PROGRESS","COMPLETED",
  "BALANCE_DUE","PAID_IN_FULL","LOST",
];

export function EstimatesTable({ estimates: initial }: EstimatesTableProps) {
  const { toast } = useToast();
  const [estimates, setEstimates] = useState(initial);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  async function changeStatus(id: string, status: string) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/estimates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      setEstimates((es) => es.map((e) => e.id === id ? { ...e, status } : e));
      toast({ title: "Status updated" });
    } catch {
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  }

  function exportCsv() {
    const rows = [
      ["Estimate #", "Customer", "Phone", "Date", "Total", "Status"],
      ...filtered.map((e) => [
        e.estimateNumber,
        e.project.customer.name,
        e.project.customer.phone || "",
        new Date(e.createdAt).toLocaleDateString(),
        e.totalAmount.toFixed(2),
        ESTIMATE_STATUS_LABELS[e.status as keyof typeof ESTIMATE_STATUS_LABELS] || e.status,
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `estimates-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((e) => e.id)));
    }
  }

  async function bulkFollowUp() {
    const ids = Array.from(selected);
    setBulkLoading(true);
    let sent = 0;
    for (const id of ids) {
      try {
        const res = await fetch(`/api/estimates/${id}/follow-up`, { method: "POST" });
        if (res.ok) sent++;
      } catch { /* non-fatal */ }
    }
    setBulkLoading(false);
    setSelected(new Set());
    toast({ title: `Follow-ups sent`, description: `Sent ${sent} of ${ids.length}` });
  }

  async function bulkChangeStatus(status: string) {
    const ids = Array.from(selected);
    setBulkLoading(true);
    for (const id of ids) {
      try {
        await fetch(`/api/estimates/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
      } catch { /* non-fatal */ }
    }
    setEstimates((es) => es.map((e) => ids.includes(e.id) ? { ...e, status } : e));
    setBulkLoading(false);
    setSelected(new Set());
    toast({ title: `${ids.length} estimates updated` });
  }

  const filtered = useMemo(() => {
    return estimates.filter((e) => {
      const matchesStatus = statusFilter === "ALL" || e.status === statusFilter;
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        e.project.customer.name.toLowerCase().includes(q) ||
        e.estimateNumber.toLowerCase().includes(q) ||
        (e.project.customer.phone || "").includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [estimates, search, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer or estimate #..."
            className="pl-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(search || statusFilter !== "ALL") && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setStatusFilter("ALL"); }}>
            Clear
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={exportCsv} className="ml-auto">
          <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {filtered.length} of {estimates.length} estimates
          {selected.size > 0 && ` · ${selected.size} selected`}
        </p>
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            {bulkLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
            <Button size="sm" variant="outline" onClick={bulkFollowUp} disabled={bulkLoading}>
              <Mail className="w-3.5 h-3.5 mr-1.5" /> Follow Up ({selected.size})
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkChangeStatus("LOST")} disabled={bulkLoading}
              className="text-red-600 border-red-200 hover:bg-red-50">
              Mark Lost
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} disabled={bulkLoading}>
              Clear
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p className="font-medium">No estimates match your filters</p>
              <p className="text-sm mt-1">Try adjusting your search or status filter</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="w-10 p-4">
                    <button onClick={toggleSelectAll} className="text-slate-400 hover:text-slate-600">
                      {selected.size > 0 && selected.size === filtered.length
                        ? <CheckSquare className="w-4 h-4 text-blue-600" />
                        : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Customer</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Estimate #</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Date</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-600">Total</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((estimate) => (
                  <tr key={estimate.id} className={`border-b last:border-0 hover:bg-slate-50 transition-colors ${selected.has(estimate.id) ? "bg-blue-50" : ""}`}>
                    <td className="p-4">
                      <button onClick={() => toggleSelect(estimate.id)} className="text-slate-400 hover:text-blue-500">
                        {selected.has(estimate.id)
                          ? <CheckSquare className="w-4 h-4 text-blue-600" />
                          : <Square className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Link href={`/estimates/${estimate.id}`} className="hover:underline font-medium text-slate-900">
                          {estimate.project.customer.name}
                        </Link>
                        {["SENT", "VIEWED"].includes(estimate.status) && estimate.sentAt && (() => {
                          const daysSinceSent = Math.floor((Date.now() - new Date(estimate.sentAt!).getTime()) / 86400000);
                          if (daysSinceSent >= 3) {
                            return (
                              <span title={`Sent ${daysSinceSent} days ago — consider following up`} className="text-amber-500">
                                <Clock className="w-3.5 h-3.5" />
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      {estimate.project.customer.phone && (
                        <p className="text-xs text-slate-500 mt-0.5">{estimate.project.customer.phone}</p>
                      )}
                    </td>
                    <td className="p-4 text-slate-600 text-sm font-mono">{estimate.estimateNumber}</td>
                    <td className="p-4 text-slate-600 text-sm">{formatDate(estimate.createdAt)}</td>
                    <td className="p-4 text-right font-semibold text-slate-900">{formatCurrency(estimate.totalAmount)}</td>
                    <td className="p-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${ESTIMATE_STATUS_COLORS[estimate.status as keyof typeof ESTIMATE_STATUS_COLORS]}`}
                            disabled={updatingId === estimate.id}
                          >
                            {updatingId === estimate.id ? "..." : ESTIMATE_STATUS_LABELS[estimate.status as keyof typeof ESTIMATE_STATUS_LABELS]}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
                          {ALL_STATUSES.map((s) => (
                            <DropdownMenuItem
                              key={s}
                              onClick={() => changeStatus(estimate.id, s)}
                              className={estimate.status === s ? "font-medium" : ""}
                            >
                              <span className={`w-2 h-2 rounded-full mr-2 shrink-0 ${ESTIMATE_STATUS_COLORS[s as keyof typeof ESTIMATE_STATUS_COLORS]?.replace("text-", "bg-").split(" ")[0]}`} />
                              {ESTIMATE_STATUS_LABELS[s as keyof typeof ESTIMATE_STATUS_LABELS]}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
