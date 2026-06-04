"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { List, LayoutGrid } from "lucide-react";
import { EstimatesTable } from "./estimates-table";
import { PipelineView } from "./pipeline-view";

interface Estimate {
  id: string;
  estimateNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  project: {
    customer: {
      name: string;
      phone?: string | null;
    };
  };
}

interface Props {
  estimates: Estimate[];
}

export function EstimatesView({ estimates }: Props) {
  const [view, setView] = useState<"list" | "pipeline">("list");

  return (
    <div>
      <div className="flex justify-end mb-4">
        <div className="flex border border-slate-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setView("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
              view === "list" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <List className="w-3.5 h-3.5" />
            List
          </button>
          <button
            onClick={() => setView("pipeline")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
              view === "pipeline" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Pipeline
          </button>
        </div>
      </div>

      {view === "list" ? (
        <EstimatesTable estimates={estimates} />
      ) : (
        <PipelineView estimates={estimates} />
      )}
    </div>
  );
}
