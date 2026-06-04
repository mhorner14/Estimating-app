"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Target, Pencil, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Props {
  monthRevenue: number;
  goal: number | null;
}

export function RevenueGoal({ monthRevenue, goal: initialGoal }: Props) {
  const { toast } = useToast();
  const [goal, setGoal] = useState(initialGoal);
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState(String(initialGoal || ""));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const val = parseFloat(input) || null;
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthlyRevenueGoal: val }),
      });
      if (!res.ok) throw new Error();
      setGoal(val);
      setEditing(false);
      toast({ title: "Goal saved" });
    } catch {
      toast({ title: "Error", description: "Failed to save goal", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const pct = goal && goal > 0 ? Math.min((monthRevenue / goal) * 100, 100) : 0;
  const remaining = goal ? Math.max(goal - monthRevenue, 0) : 0;

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="w-4 h-4 text-purple-600" />
          Monthly Goal
        </CardTitle>
        {!editing && (
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setInput(String(goal || "")); setEditing(true); }}>
            <Pencil className="w-3 h-3 mr-1" /> {goal ? "Edit" : "Set Goal"}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
              <Input
                type="number"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="pl-6"
                placeholder="50000"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
              />
            </div>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        ) : goal ? (
          <div className="space-y-3">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-slate-500">This Month</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(monthRevenue)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Goal</p>
                <p className="text-lg font-semibold text-slate-600">{formatCurrency(goal)}</p>
              </div>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-emerald-500" : pct >= 75 ? "bg-blue-500" : pct >= 50 ? "bg-orange-400" : "bg-slate-400"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>{pct.toFixed(0)}% of goal</span>
              <span>{remaining > 0 ? `${formatCurrency(remaining)} to go` : "🎉 Goal reached!"}</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-slate-400">Set a monthly revenue goal to track your progress</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
