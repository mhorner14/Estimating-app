"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Circle, ChevronDown, ChevronUp, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  href: string;
  completed: boolean;
}

interface Props {
  items: ChecklistItem[];
}

export function OnboardingChecklist({ items }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const completedCount = items.filter((i) => i.completed).length;
  const allDone = completedCount === items.length;

  if (allDone) return null;

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2 text-blue-900">
            <Rocket className="w-4 h-4 text-blue-600" />
            Get Started — {completedCount}/{items.length} complete
          </CardTitle>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="text-blue-600 hover:text-blue-800"
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
        <div className="h-1.5 bg-blue-200 rounded-full overflow-hidden mt-2">
          <div
            className="h-full bg-blue-600 rounded-full transition-all"
            style={{ width: `${(completedCount / items.length) * 100}%` }}
          />
        </div>
      </CardHeader>
      {!collapsed && (
        <CardContent className="pt-2 pb-4">
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg transition-colors",
                  item.completed ? "bg-blue-100/50" : "bg-white border border-blue-100"
                )}
              >
                {item.completed ? (
                  <CheckCircle className="w-5 h-5 text-blue-600 shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-blue-300 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium", item.completed ? "text-blue-700 line-through" : "text-slate-800")}>
                    {item.label}
                  </p>
                  {!item.completed && (
                    <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                  )}
                </div>
                {!item.completed && (
                  <Button size="sm" variant="outline" className="shrink-0 border-blue-200 text-blue-700 hover:bg-blue-50" asChild>
                    <Link href={item.href}>Go</Link>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
