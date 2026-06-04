"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, MapPin, ChevronLeft, ChevronRight, Calendar, List } from "lucide-react";
import { formatCurrency, ESTIMATE_STATUS_LABELS, ESTIMATE_STATUS_COLORS } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Job {
  id: string;
  estimateNumber: string;
  status: string;
  scheduledDate: string;
  totalAmount: number;
  customerName: string;
  customerPhone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function ScheduleView({ jobs }: { jobs: Job[] }) {
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const jobsByDate = useMemo(() => {
    const map: Record<string, Job[]> = {};
    for (const job of jobs) {
      const d = new Date(job.scheduledDate);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(job);
    }
    return map;
  }, [jobs]);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  // pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1);
  }

  const upcomingJobs = jobs.filter((j) => new Date(j.scheduledDate) >= new Date(today.toDateString()));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-0.5">
          <button
            onClick={() => setView("calendar")}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors", view === "calendar" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900")}
          >
            <Calendar className="w-3.5 h-3.5" /> Calendar
          </button>
          <button
            onClick={() => setView("list")}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors", view === "list" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900")}
          >
            <List className="w-3.5 h-3.5" /> List
          </button>
        </div>
        <p className="text-sm text-slate-500">{jobs.length} scheduled job{jobs.length !== 1 ? "s" : ""}</p>
      </div>

      {view === "calendar" ? (
        <Card>
          <CardContent className="p-0">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <button onClick={prevMonth} className="p-1 hover:bg-slate-100 rounded-md">
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
              <h2 className="font-semibold text-slate-900">{MONTHS[month]} {year}</h2>
              <button onClick={nextMonth} className="p-1 hover:bg-slate-100 rounded-md">
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 border-b">
              {DAYS.map((d) => (
                <div key={d} className="py-2 text-center text-xs font-medium text-slate-500">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7">
              {cells.map((day, i) => {
                const key = day ? `${year}-${month}-${day}` : null;
                const dayJobs = key ? (jobsByDate[key] || []) : [];
                const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

                return (
                  <div
                    key={i}
                    className={cn(
                      "min-h-[80px] border-b border-r p-1.5",
                      !day && "bg-slate-50",
                      i % 7 === 6 && "border-r-0"
                    )}
                  >
                    {day && (
                      <>
                        <div className={cn(
                          "w-6 h-6 flex items-center justify-center text-xs font-medium rounded-full mb-1",
                          isToday ? "bg-blue-600 text-white" : "text-slate-600"
                        )}>
                          {day}
                        </div>
                        <div className="space-y-0.5">
                          {dayJobs.map((job) => (
                            <Link
                              key={job.id}
                              href={`/estimates/${job.id}`}
                              className="block bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded px-1.5 py-0.5 text-xs text-blue-800 truncate transition-colors"
                              title={job.customerName}
                            >
                              {job.customerName}
                            </Link>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div>
          {jobs.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">No jobs scheduled</p>
              <p className="text-sm mt-1">Set a scheduled date on an estimate to see it here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => {
                const d = new Date(job.scheduledDate);
                const isPast = d < today;
                return (
                  <Card key={job.id} className={isPast ? "opacity-60" : ""}>
                    <CardContent className="py-4 flex items-center gap-4">
                      <div className={cn("text-center min-w-[52px] rounded-lg p-2", isPast ? "bg-slate-100" : "bg-blue-50")}>
                        <p className={cn("text-xs font-medium", isPast ? "text-slate-500" : "text-blue-600")}>{MONTHS[d.getMonth()].slice(0, 3)}</p>
                        <p className={cn("text-2xl font-bold leading-none", isPast ? "text-slate-600" : "text-blue-700")}>{d.getDate()}</p>
                        <p className={cn("text-xs", isPast ? "text-slate-400" : "text-blue-500")}>{d.getFullYear()}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link href={`/estimates/${job.id}`} className="font-semibold text-slate-900 hover:text-blue-600 hover:underline">
                          {job.customerName}
                        </Link>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">{job.estimateNumber}</p>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          {job.address && (
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <MapPin className="w-3 h-3" />
                              {[job.address, job.city, job.state].filter(Boolean).join(", ")}
                            </span>
                          )}
                          {job.customerPhone && (
                            <a href={`tel:${job.customerPhone}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                              <Phone className="w-3 h-3" /> {job.customerPhone}
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-slate-900">{formatCurrency(job.totalAmount)}</p>
                        <span className={cn("mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-medium", ESTIMATE_STATUS_COLORS[job.status as keyof typeof ESTIMATE_STATUS_COLORS])}>
                          {ESTIMATE_STATUS_LABELS[job.status as keyof typeof ESTIMATE_STATUS_LABELS]}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
