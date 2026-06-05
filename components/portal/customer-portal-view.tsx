"use client";

import Link from "next/link";
import { Building2, FileText, CheckCircle, Clock, XCircle, CalendarDays, Phone, Mail, ExternalLink } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface PortalPhoto {
  id: string;
  url: string;
  caption: string | null;
  photoType: string;
}

interface PortalEstimate {
  id: string;
  estimateNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  projectName: string;
  projectAddress: string;
  proposalToken: string | null;
  isWon: boolean;
  scheduledDate: string | null;
  photos: PortalPhoto[];
}

interface PortalData {
  name: string;
  email: string | null;
  phone: string | null;
  company: {
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
  };
  estimates: PortalEstimate[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  DRAFT: { label: "Draft", color: "text-slate-500 bg-slate-100", icon: FileText },
  READY_FOR_REVIEW: { label: "Ready", color: "text-blue-600 bg-blue-100", icon: FileText },
  SENT: { label: "Sent", color: "text-blue-600 bg-blue-100", icon: Clock },
  VIEWED: { label: "Viewed", color: "text-purple-600 bg-purple-100", icon: Clock },
  ACCEPTED: { label: "Accepted", color: "text-emerald-600 bg-emerald-100", icon: CheckCircle },
  DEPOSIT_PAID: { label: "Deposit Paid", color: "text-emerald-600 bg-emerald-100", icon: CheckCircle },
  SCHEDULED: { label: "Scheduled", color: "text-emerald-600 bg-emerald-100", icon: CalendarDays },
  IN_PROGRESS: { label: "In Progress", color: "text-blue-700 bg-blue-100", icon: Clock },
  COMPLETED: { label: "Completed", color: "text-emerald-700 bg-emerald-100", icon: CheckCircle },
  BALANCE_DUE: { label: "Balance Due", color: "text-amber-600 bg-amber-100", icon: Clock },
  PAID_IN_FULL: { label: "Paid in Full", color: "text-emerald-700 bg-emerald-100", icon: CheckCircle },
  LOST: { label: "Declined", color: "text-red-500 bg-red-100", icon: XCircle },
};

export function CustomerPortalView({ data }: { data: PortalData }) {
  const activeEstimates = data.estimates.filter((e) => !["LOST", "DRAFT"].includes(e.status));
  const pastEstimates = data.estimates.filter((e) => ["LOST", "COMPLETED", "PAID_IN_FULL"].includes(e.status));

  function EstimateCard({ e }: { e: PortalEstimate }) {
    const cfg = STATUS_CONFIG[e.status] || { label: e.status, color: "text-slate-500 bg-slate-100", icon: FileText };
    const Icon = cfg.icon;
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-slate-400 font-medium">{e.estimateNumber}</p>
            <p className="font-semibold text-slate-900">{e.projectName}</p>
            {e.projectAddress && <p className="text-sm text-slate-500">{e.projectAddress}</p>}
          </div>
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
            <Icon className="w-3 h-3" />
            {cfg.label}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Quote total</span>
          <span className="font-semibold text-slate-900">{formatCurrency(e.totalAmount)}</span>
        </div>

        {e.scheduledDate && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
            <CalendarDays className="w-3.5 h-3.5" />
            Scheduled: {formatDate(e.scheduledDate)}
          </div>
        )}

        {e.proposalToken && !["LOST", "DRAFT"].includes(e.status) && (
          <Link
            href={`/proposal/${e.proposalToken}`}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            View Proposal
          </Link>
        )}

        {e.photos && e.photos.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-400 mb-1.5">Job Photos</p>
            <div className="grid grid-cols-3 gap-1.5">
              {e.photos.slice(0, 6).map((ph) => (
                <div key={ph.id} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100">
                  <img src={ph.url} alt={ph.caption || ph.photoType} className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-xs px-1 py-0.5 text-center capitalize">
                    {ph.photoType.toLowerCase().replace(/_/g, " ")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-slate-400">Created {formatDate(e.createdAt)}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-slate-900 text-white">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-lg">{data.company.name}</p>
              {(data.company.city || data.company.state) && (
                <p className="text-sm text-slate-400">{[data.company.city, data.company.state].filter(Boolean).join(", ")}</p>
              )}
            </div>
          </div>
          <div className="border-t border-slate-700 pt-4">
            <p className="text-slate-300 text-sm">Welcome back,</p>
            <p className="text-xl font-semibold">{data.name}</p>
          </div>
        </div>
      </div>

      {/* Contact bar */}
      {(data.company.phone || data.company.email) && (
        <div className="bg-slate-800 text-slate-300 text-sm">
          <div className="max-w-2xl mx-auto px-4 py-2 flex gap-4">
            {data.company.phone && (
              <a href={`tel:${data.company.phone}`} className="flex items-center gap-1.5 hover:text-white transition-colors">
                <Phone className="w-3.5 h-3.5" />
                {data.company.phone}
              </a>
            )}
            {data.company.email && (
              <a href={`mailto:${data.company.email}`} className="flex items-center gap-1.5 hover:text-white transition-colors">
                <Mail className="w-3.5 h-3.5" />
                {data.company.email}
              </a>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {data.estimates.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No proposals yet.</p>
          </div>
        ) : (
          <>
            {activeEstimates.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Active Proposals</h2>
                <div className="space-y-4">
                  {activeEstimates.map((e) => <EstimateCard key={e.id} e={e} />)}
                </div>
              </section>
            )}

            {pastEstimates.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Past Projects</h2>
                <div className="space-y-4">
                  {pastEstimates.map((e) => <EstimateCard key={e.id} e={e} />)}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
