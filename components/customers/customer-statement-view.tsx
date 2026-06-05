"use client";

import { formatCurrency, formatDate, ESTIMATE_STATUS_LABELS } from "@/lib/utils";
import { Building2, Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface Payment {
  id: string;
  amount: number;
  type: string;
  method: string | null;
  paidAt: string;
}

interface EstimateSummary {
  id: string;
  estimateNumber: string;
  status: string;
  totalAmount: number;
  depositAmount: number;
  balanceDue: number;
  createdAt: string;
  projectName: string;
  payments: Payment[];
}

interface StatementData {
  customer: {
    name: string;
    email: string | null;
    phone: string | null;
    projectAddress: string | null;
    city: string | null;
    state: string | null;
  };
  company: {
    name: string;
    logo: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    licenseNumber: string | null;
  };
  estimates: EstimateSummary[];
  generatedAt: string;
}

const PAID_STATUSES = ["COMPLETED", "PAID_IN_FULL", "BALANCE_DUE", "ACCEPTED", "DEPOSIT_PAID", "SCHEDULED", "IN_PROGRESS"];

export function CustomerStatementView({ data }: { data: StatementData }) {
  const { customer, company, estimates } = data;

  const activeEstimates = estimates.filter((e) => PAID_STATUSES.includes(e.status));
  const totalBilled = activeEstimates.reduce((sum, e) => sum + e.totalAmount, 0);
  const totalPaid = activeEstimates.reduce(
    (sum, e) => sum + e.payments.reduce((s, p) => s + p.amount, 0),
    0
  );
  const totalOutstanding = Math.max(0, totalBilled - totalPaid);

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      <div className="max-w-3xl mx-auto py-8 px-4 print:py-0 print:px-0">
        <div className="flex items-center justify-between mb-6 print:hidden">
          <Button variant="ghost" size="sm" asChild>
            <Link href="..">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Link>
          </Button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5"
          >
            <Printer className="w-3.5 h-3.5" /> Print / Save PDF
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden print:shadow-none print:border-0 print:rounded-none">
          {/* Header */}
          <div className="bg-slate-900 text-white p-8">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  {company.logo ? (
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center p-1">
                      <img src={company.logo} alt={company.name} className="max-w-full max-h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <p className="text-xl font-bold">{company.name}</p>
                </div>
                <div className="space-y-0.5 text-sm text-slate-300">
                  {company.phone && <p>{company.phone}</p>}
                  {company.email && <p>{company.email}</p>}
                  {company.address && <p>{company.address}{company.city ? `, ${company.city}` : ""}{company.state ? `, ${company.state}` : ""} {company.zip || ""}</p>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">STATEMENT</p>
                <p className="text-slate-400 text-sm mt-1">Generated {formatDate(data.generatedAt)}</p>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-8">
            {/* Customer Info */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Billed To</p>
                <p className="font-semibold text-slate-900">{customer.name}</p>
                {customer.email && <p className="text-sm text-slate-600">{customer.email}</p>}
                {customer.phone && <p className="text-sm text-slate-600">{customer.phone}</p>}
                {customer.projectAddress && (
                  <p className="text-sm text-slate-600">
                    {customer.projectAddress}{customer.city ? `, ${customer.city}` : ""}{customer.state ? `, ${customer.state}` : ""}
                  </p>
                )}
              </div>
              <div>
                <div className="p-4 bg-slate-50 rounded-lg text-right">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Outstanding Balance</p>
                  <p className={`text-3xl font-bold ${totalOutstanding > 0 ? "text-red-600" : "text-emerald-600"}`}>
                    {formatCurrency(totalOutstanding)}
                  </p>
                  {totalOutstanding === 0 && <p className="text-sm text-emerald-600 mt-1">Paid in full</p>}
                </div>
              </div>
            </div>

            {/* Summary row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Total Billed</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(totalBilled)}</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Total Paid</p>
                <p className="text-xl font-bold text-green-700 mt-1">{formatCurrency(totalPaid)}</p>
              </div>
              <div className={`text-center p-3 rounded-lg ${totalOutstanding > 0 ? "bg-red-50" : "bg-green-50"}`}>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Balance Due</p>
                <p className={`text-xl font-bold mt-1 ${totalOutstanding > 0 ? "text-red-600" : "text-green-700"}`}>
                  {formatCurrency(totalOutstanding)}
                </p>
              </div>
            </div>

            <Separator />

            {/* Estimate breakdown */}
            {activeEstimates.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No active jobs found for this customer.</p>
            ) : (
              <div className="space-y-6">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Job Details</h3>
                {activeEstimates.map((est) => {
                  const paid = est.payments.reduce((s, p) => s + p.amount, 0);
                  const remaining = Math.max(0, est.totalAmount - paid);
                  return (
                    <div key={est.id} className="border border-slate-200 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">{est.projectName}</p>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">{est.estimateNumber} · {formatDate(est.createdAt)}</p>
                        </div>
                        <span className="text-xs font-medium px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full">
                          {ESTIMATE_STATUS_LABELS[est.status as keyof typeof ESTIMATE_STATUS_LABELS] || est.status}
                        </span>
                      </div>
                      <table className="w-full text-sm">
                        <tbody>
                          <tr className="border-b border-slate-100">
                            <td className="px-4 py-2 text-slate-600">Job Total</td>
                            <td className="px-4 py-2 text-right font-medium">{formatCurrency(est.totalAmount)}</td>
                          </tr>
                          {est.payments.map((pay) => (
                            <tr key={pay.id} className="border-b border-slate-100 bg-green-50">
                              <td className="px-4 py-2 text-green-700">
                                Payment received
                                <span className="text-xs text-slate-400 ml-2">{formatDate(pay.paidAt)}</span>
                                {pay.method && <span className="text-xs text-slate-400 ml-1">via {pay.method}</span>}
                              </td>
                              <td className="px-4 py-2 text-right font-medium text-green-700">−{formatCurrency(pay.amount)}</td>
                            </tr>
                          ))}
                          <tr className={remaining > 0 ? "bg-red-50" : ""}>
                            <td className="px-4 py-2 font-semibold text-slate-900">Balance</td>
                            <td className={`px-4 py-2 text-right font-bold ${remaining > 0 ? "text-red-600" : "text-emerald-600"}`}>
                              {formatCurrency(remaining)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            )}

            <Separator />

            <p className="text-center text-xs text-slate-400">
              {company.name}{company.phone ? ` · ${company.phone}` : ""}{company.email ? ` · ${company.email}` : ""}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
