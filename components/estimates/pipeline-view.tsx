"use client";

import { useState } from "react";
import Link from "next/link";
import { ESTIMATE_STATUS_LABELS, formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Estimate {
  id: string;
  estimateNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  project: {
    customer: {
      name: string;
    };
  };
}

interface Props {
  estimates: Estimate[];
}

const PIPELINE_STAGES = [
  {
    key: "draft",
    label: "Draft / New",
    statuses: ["DRAFT", "NEEDS_CLARIFICATION", "READY_FOR_REVIEW"],
    color: "border-slate-300",
    headerColor: "bg-slate-100 text-slate-700",
    dotColor: "bg-slate-400",
  },
  {
    key: "sent",
    label: "Sent / Out",
    statuses: ["SENT", "VIEWED"],
    color: "border-blue-300",
    headerColor: "bg-blue-50 text-blue-700",
    dotColor: "bg-blue-500",
  },
  {
    key: "accepted",
    label: "Accepted / Active",
    statuses: ["ACCEPTED", "DEPOSIT_PAID", "SCHEDULED", "IN_PROGRESS"],
    color: "border-emerald-300",
    headerColor: "bg-emerald-50 text-emerald-700",
    dotColor: "bg-emerald-500",
  },
  {
    key: "complete",
    label: "Complete",
    statuses: ["COMPLETED", "BALANCE_DUE", "PAID_IN_FULL"],
    color: "border-purple-300",
    headerColor: "bg-purple-50 text-purple-700",
    dotColor: "bg-purple-500",
  },
  {
    key: "lost",
    label: "Lost",
    statuses: ["LOST"],
    color: "border-red-300",
    headerColor: "bg-red-50 text-red-700",
    dotColor: "bg-red-400",
  },
];

export function PipelineView({ estimates: initial }: Props) {
  const [estimates, setEstimates] = useState(initial);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const dragIdRef = useState<string | null>(null);
  const { toast } = useToast();

  async function moveEstimate(id: string, newStatus: string) {
    const prev = estimates;
    setEstimates((es) => es.map((e) => (e.id === id ? { ...e, status: newStatus } : e)));

    const res = await fetch(`/api/estimates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!res.ok) {
      setEstimates(prev);
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  }

  function handleDrop(stageKey: string) {
    const dragId = dragIdRef[0];
    if (!dragId) return;
    const stage = PIPELINE_STAGES.find((s) => s.key === stageKey);
    if (!stage) return;
    const targetStatus = stage.statuses[0];
    moveEstimate(dragId, targetStatus);
    dragIdRef[1](null);
    setDragOverStage(null);
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {PIPELINE_STAGES.map((stage) => {
          const stageEstimates = estimates.filter((e) => stage.statuses.includes(e.status));
          const stageValue = stageEstimates.reduce((sum, e) => sum + e.totalAmount, 0);
          const isOver = dragOverStage === stage.key;

          return (
            <div
              key={stage.key}
              className="w-64 shrink-0"
              onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage.key); }}
              onDragLeave={() => setDragOverStage(null)}
              onDrop={() => handleDrop(stage.key)}
            >
              <div className={`rounded-lg px-3 py-2 mb-3 ${stage.headerColor} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${stage.dotColor}`} />
                  <span className="text-sm font-semibold">{stage.label}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-medium opacity-75">{stageEstimates.length}</span>
                </div>
              </div>
              {stageValue > 0 && (
                <p className="text-xs text-slate-500 mb-2 px-1">{formatCurrency(stageValue)}</p>
              )}

              <div className={`space-y-2 min-h-16 rounded-lg transition-colors ${isOver ? "bg-blue-50 ring-2 ring-blue-300 ring-dashed p-1" : ""}`}>
                {stageEstimates.map((estimate) => (
                  <EstimateCard
                    key={estimate.id}
                    estimate={estimate}
                    stage={stage}
                    onMove={moveEstimate}
                    onDragStart={(id) => dragIdRef[1](id)}
                  />
                ))}
                {stageEstimates.length === 0 && (
                  <div className={`border-2 border-dashed rounded-lg p-4 text-center text-xs transition-colors ${isOver ? "border-blue-300 text-blue-400" : "border-slate-200 text-slate-400"}`}>
                    {isOver ? "Drop here" : "No estimates"}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EstimateCard({
  estimate,
  stage,
  onMove,
  onDragStart,
}: {
  estimate: Estimate;
  stage: (typeof PIPELINE_STAGES)[number];
  onMove: (id: string, status: string) => void;
  onDragStart: (id: string) => void;
}) {
  const allStatuses = PIPELINE_STAGES.flatMap((s) => s.statuses);
  const currentIdx = allStatuses.indexOf(estimate.status);

  const prevStatus = currentIdx > 0 ? allStatuses[currentIdx - 1] : null;
  const nextStatus = currentIdx < allStatuses.length - 1 ? allStatuses[currentIdx + 1] : null;

  return (
    <div
      className={`bg-white border ${stage.color} rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow group cursor-grab active:cursor-grabbing`}
      draggable
      onDragStart={() => onDragStart(estimate.id)}
    >
      <Link href={`/estimates/${estimate.id}`} className="block">
        <p className="text-sm font-semibold text-slate-900 truncate leading-tight">
          {estimate.project.customer.name}
        </p>
        <p className="text-xs text-slate-500 font-mono mt-0.5">{estimate.estimateNumber}</p>
        <p className="text-sm font-bold text-slate-800 mt-2">{formatCurrency(estimate.totalAmount)}</p>
        <p className="text-xs text-slate-400 mt-0.5">
          {ESTIMATE_STATUS_LABELS[estimate.status as keyof typeof ESTIMATE_STATUS_LABELS] || estimate.status}
        </p>
      </Link>
      <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {prevStatus && (
          <button
            onClick={() => onMove(estimate.id, prevStatus)}
            className="text-xs px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 transition-colors"
            title={`Move to ${ESTIMATE_STATUS_LABELS[prevStatus as keyof typeof ESTIMATE_STATUS_LABELS] || prevStatus}`}
          >
            ← Back
          </button>
        )}
        {nextStatus && (
          <button
            onClick={() => onMove(estimate.id, nextStatus)}
            className="text-xs px-2 py-0.5 bg-blue-100 hover:bg-blue-200 rounded text-blue-700 transition-colors ml-auto"
            title={`Move to ${ESTIMATE_STATUS_LABELS[nextStatus as keyof typeof ESTIMATE_STATUS_LABELS] || nextStatus}`}
          >
            Next →
          </button>
        )}
      </div>
    </div>
  );
}
