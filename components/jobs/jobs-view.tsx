"use client";

import { useState } from "react";
import Link from "next/link";
import { Phone, MapPin, ExternalLink, ChevronRight, CheckCircle, Loader2, Calendar, DollarSign, Layers, ClipboardEdit, Save } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Job {
  id: string;
  estimateNumber: string;
  status: string;
  totalAmount: number;
  depositAmount: number;
  balanceDue: number;
  squareFootage: number | null;
  colorSelection: string | null;
  scheduledDate: string | null;
  internalNotes: string | null;
  crewNotes: string | null;
  customer: { name: string; phone: string | null; email: string | null };
  address: string;
  city: string;
  state: string;
  photoUrl: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; next?: string; nextLabel?: string }> = {
  DEPOSIT_PAID: { label: "Deposit Paid", color: "bg-blue-100 text-blue-700", next: "SCHEDULED", nextLabel: "Mark Scheduled" },
  SCHEDULED: { label: "Scheduled", color: "bg-emerald-100 text-emerald-700", next: "IN_PROGRESS", nextLabel: "Start Job" },
  IN_PROGRESS: { label: "In Progress", color: "bg-amber-100 text-amber-700", next: "COMPLETED", nextLabel: "Mark Complete" },
};

export function JobsView({ jobs: initialJobs }: { jobs: Job[] }) {
  const { toast } = useToast();
  const [jobs, setJobs] = useState(initialJobs);
  const [updating, setUpdating] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState("");

  async function advanceStatus(jobId: string, newStatus: string) {
    setUpdating(jobId);
    try {
      const res = await fetch(`/api/estimates/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      if (newStatus === "COMPLETED") {
        setJobs((prev) => prev.filter((j) => j.id !== jobId));
        toast({ title: "Job marked complete! 🎉" });
      } else {
        setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, status: newStatus } : j));
        toast({ title: `Status updated to ${newStatus.replace(/_/g, " ")}` });
      }
    } catch {
      toast({ title: "Error updating status", variant: "destructive" });
    } finally {
      setUpdating(null);
    }
  }

  async function saveCrewNotes(jobId: string) {
    try {
      await fetch(`/api/estimates/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crewNotes: notesValue }),
      });
      setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, crewNotes: notesValue } : j));
      toast({ title: "Crew notes saved" });
      setEditingNotes(null);
    } catch {
      toast({ title: "Error saving notes", variant: "destructive" });
    }
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-400" />
        <p className="font-medium text-slate-600">No active jobs right now</p>
        <p className="text-sm mt-1">Jobs show here when they're scheduled or in progress.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {jobs.map((job) => {
        const cfg = STATUS_CONFIG[job.status];
        const fullAddress = [job.address, job.city, job.state].filter(Boolean).join(", ");
        const mapsUrl = fullAddress ? `https://maps.google.com/?q=${encodeURIComponent(fullAddress)}` : null;

        return (
          <div key={job.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-400 font-medium">{job.estimateNumber}</p>
                  <p className="font-bold text-slate-900 text-lg leading-tight">{job.customer.name}</p>
                </div>
                {cfg && (
                  <Badge className={`${cfg.color} border-0 shrink-0`}>{cfg.label}</Badge>
                )}
              </div>

              {job.scheduledDate && (
                <div className="flex items-center gap-1.5 mt-2 text-sm text-slate-600">
                  <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                  {formatDate(job.scheduledDate)}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="p-5 space-y-3">
              {fullAddress && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm text-slate-700">{fullAddress}</p>
                    {mapsUrl && (
                      <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5 mt-0.5">
                        Open in Maps <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {job.customer.phone && (
                <a href={`tel:${job.customer.phone}`} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
                  <Phone className="w-4 h-4" />
                  {job.customer.phone}
                </a>
              )}

              <div className="grid grid-cols-3 gap-2 pt-1">
                {job.squareFootage && (
                  <div className="bg-slate-50 rounded-lg p-2 text-center">
                    <p className="text-xs text-slate-500">Sqft</p>
                    <p className="text-sm font-semibold text-slate-900">{job.squareFootage.toLocaleString()}</p>
                  </div>
                )}
                <div className="bg-slate-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-slate-500">Total</p>
                  <p className="text-sm font-semibold text-slate-900">{formatCurrency(job.totalAmount)}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-slate-500">Balance</p>
                  <p className={`text-sm font-semibold ${job.balanceDue > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                    {formatCurrency(job.balanceDue)}
                  </p>
                </div>
              </div>

              {job.colorSelection && (
                <div className="flex items-center gap-2 text-sm">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-600">Color: <span className="font-medium">{job.colorSelection}</span></span>
                </div>
              )}

              {job.internalNotes && (
                <div className="bg-amber-50 rounded-lg px-3 py-2 text-xs text-amber-800 border border-amber-100">
                  <p className="font-medium mb-0.5">Notes</p>
                  <p>{job.internalNotes}</p>
                </div>
              )}

              {editingNotes === job.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={notesValue}
                    onChange={(e) => setNotesValue(e.target.value)}
                    placeholder="Crew instructions, prep steps, access codes..."
                    rows={3}
                    className="text-xs"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs flex-1" onClick={() => saveCrewNotes(job.id)}>
                      <Save className="w-3 h-3 mr-1" />Save
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingNotes(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div
                  className="flex items-start gap-2 cursor-pointer group"
                  onClick={() => { setEditingNotes(job.id); setNotesValue(job.crewNotes || ""); }}
                >
                  <ClipboardEdit className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-slate-400 group-hover:text-slate-600 transition-colors">
                    {job.crewNotes || "Add crew notes…"}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-5 pb-5 flex gap-2">
              {cfg?.next && (
                <Button
                  className="flex-1"
                  onClick={() => advanceStatus(job.id, cfg.next!)}
                  disabled={updating === job.id}
                >
                  {updating === job.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {cfg.nextLabel}
                </Button>
              )}
              <Link href={`/estimates/${job.id}`}>
                <Button variant="outline" size="icon">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
