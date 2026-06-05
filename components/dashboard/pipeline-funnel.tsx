"use client";

import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

interface PipelineStage {
  status: string;
  label: string;
  count: number;
  value: number;
  color: string;
  href: string;
}

interface PipelineFunnelProps {
  estimates: Array<{ status: string; totalAmount: number }>;
}

const STAGES = [
  { status: "DRAFT", label: "Draft", color: "bg-slate-400", href: "/estimates?status=DRAFT" },
  { status: "READY_FOR_REVIEW", label: "Ready", color: "bg-blue-400", href: "/estimates?status=READY_FOR_REVIEW" },
  { status: "SENT", label: "Sent", color: "bg-indigo-500", href: "/estimates?status=SENT" },
  { status: "VIEWED", label: "Viewed", color: "bg-purple-500", href: "/estimates?status=VIEWED" },
  { status: "ACCEPTED", label: "Accepted", color: "bg-emerald-500", href: "/estimates?status=ACCEPTED" },
];

export function PipelineFunnel({ estimates }: PipelineFunnelProps) {
  const stages: PipelineStage[] = STAGES.map((s) => {
    const matching = estimates.filter((e) => e.status === s.status);
    return {
      ...s,
      count: matching.length,
      value: matching.reduce((sum, e) => sum + e.totalAmount, 0),
    };
  });

  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div className="space-y-2">
      {stages.map((stage) => (
        <Link key={stage.status} href={stage.href} className="block group">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 w-16 shrink-0 text-right">{stage.label}</span>
            <div className="flex-1 h-7 bg-slate-100 rounded-md overflow-hidden relative">
              <div
                className={`h-full ${stage.color} rounded-md transition-all duration-500 group-hover:opacity-90`}
                style={{ width: stage.count > 0 ? `${Math.max((stage.count / maxCount) * 100, 8)}%` : "0%" }}
              />
              {stage.count > 0 && (
                <div className="absolute inset-0 flex items-center px-2.5 gap-2">
                  <span className="text-xs font-semibold text-white drop-shadow">{stage.count}</span>
                  <span className="text-xs text-white/80 drop-shadow">{formatCurrency(stage.value)}</span>
                </div>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
