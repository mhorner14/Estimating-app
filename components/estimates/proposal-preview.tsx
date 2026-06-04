"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Loader2, Building2, MapPin, Calendar, Phone, Mail } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface ProposalPreviewProps {
  estimate: any;
  onGenerate: () => void;
  generating: boolean;
}

export function ProposalPreview({ estimate, onGenerate, generating }: ProposalPreviewProps) {
  if (!estimate.scopeOfWork) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Ready to generate your proposal?</h3>
        <p className="text-slate-500 text-sm max-w-md mb-6">
          The AI will write a professional, premium proposal based on your estimate details.
          Takes about 10 seconds.
        </p>
        <Button onClick={onGenerate} disabled={generating} size="lg">
          {generating ? (
            <><Loader2 className="mr-2 w-4 h-4 animate-spin" /> Generating...</>
          ) : (
            <><Sparkles className="mr-2 w-4 h-4" /> Generate Proposal</>
          )}
        </Button>
      </div>
    );
  }

  const company = estimate.company;
  const customer = estimate.project.customer;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Proposal Document */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white p-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold">{company?.name}</p>
                  {company?.licenseNumber && (
                    <p className="text-slate-400 text-sm">License #{company.licenseNumber}</p>
                  )}
                </div>
              </div>
              <div className="space-y-1 text-sm text-slate-300">
                {company?.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5" /> {company.phone}
                  </div>
                )}
                {company?.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5" /> {company.email}
                  </div>
                )}
                {company?.website && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs">🌐</span> {company.website}
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-slate-400 text-sm">Proposal #</p>
              <p className="text-xl font-bold">{estimate.estimateNumber}</p>
              <p className="text-slate-400 text-sm mt-2">Date</p>
              <p className="text-sm">{formatDate(estimate.createdAt)}</p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-6 p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Prepared For</p>
              <p className="font-semibold text-slate-900">{customer.name}</p>
              {customer.email && <p className="text-sm text-slate-600">{customer.email}</p>}
              {customer.phone && <p className="text-sm text-slate-600">{customer.phone}</p>}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Project Location</p>
              <div className="flex items-start gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500 mt-0.5" />
                <p className="text-sm text-slate-700">{customer.projectAddress || estimate.project.address || "Address on file"}</p>
              </div>
            </div>
          </div>

          {/* Title */}
          {estimate.proposalTitle && (
            <div>
              <h2 className="text-xl font-bold text-slate-900">{estimate.proposalTitle}</h2>
            </div>
          )}

          {/* Scope of Work */}
          {estimate.scopeOfWork && (
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Scope of Work</h3>
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{estimate.scopeOfWork}</p>
            </div>
          )}

          {/* Surface Preparation */}
          {estimate.prepSteps && (
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Surface Preparation</h3>
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{estimate.prepSteps}</p>
            </div>
          )}

          {/* Products / System */}
          {estimate.productsIncluded && (
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">System & Products</h3>
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{estimate.productsIncluded}</p>
            </div>
          )}

          {/* Color */}
          {estimate.colorSelection && (
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1">Color Selection</h3>
              <p className="text-slate-700">{estimate.colorSelection}</p>
            </div>
          )}

          <Separator />

          {/* Pricing Table */}
          <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Investment Summary</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 font-semibold text-slate-700">Description</th>
                  <th className="text-right py-2 font-semibold text-slate-700">Qty</th>
                  <th className="text-right py-2 font-semibold text-slate-700">Unit Price</th>
                  <th className="text-right py-2 font-semibold text-slate-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {estimate.lineItems
                  .filter((item: any) => !item.isOptional)
                  .map((item: any) => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="py-3 text-slate-700">{item.description}</td>
                      <td className="py-3 text-right text-slate-600">
                        {item.quantity.toLocaleString()} {item.unit}
                      </td>
                      <td className="py-3 text-right text-slate-600">{formatCurrency(item.unitPrice)}</td>
                      <td className="py-3 text-right font-medium">{formatCurrency(item.totalPrice)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>

            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Subtotal</span>
                <span>{formatCurrency(estimate.subtotal)}</span>
              </div>
              {estimate.taxAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Tax</span>
                  <span>{formatCurrency(estimate.taxAmount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total Investment</span>
                <span>{formatCurrency(estimate.totalAmount)}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Payment Terms */}
          <div className="grid grid-cols-2 gap-4 p-4 border border-blue-100 bg-blue-50 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-1">Deposit Due</p>
              <p className="text-2xl font-bold text-blue-700">{formatCurrency(estimate.depositAmount)}</p>
              <p className="text-xs text-blue-600 mt-1">Due upon acceptance</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-600 font-semibold uppercase tracking-wide mb-1">Balance Due</p>
              <p className="text-2xl font-bold text-slate-700">{formatCurrency(estimate.balanceDue)}</p>
              <p className="text-xs text-slate-600 mt-1">Due upon completion</p>
            </div>
          </div>

          {/* Warranty */}
          {estimate.warrantyText && (
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Warranty</h3>
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{estimate.warrantyText}</p>
            </div>
          )}

          {/* Exclusions */}
          {estimate.exclusions && (
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Exclusions</h3>
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{estimate.exclusions}</p>
            </div>
          )}

          {/* Signature Block */}
          {estimate.signature ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Digitally Signed
              </div>
              <p className="text-sm text-green-700">
                Signed by <strong>{estimate.signature.signerName}</strong> on{" "}
                {formatDate(estimate.signature.signedAt)}
              </p>
            </div>
          ) : (
            <div className="border-t-2 border-dashed border-slate-300 pt-6 mt-6">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-xs text-slate-500 mb-4">Customer Signature</p>
                  <div className="h-12 border-b border-slate-300" />
                  <p className="text-xs text-slate-500 mt-1">Signature</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-4">Date</p>
                  <div className="h-12 border-b border-slate-300" />
                  <p className="text-xs text-slate-500 mt-1">Date</p>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          {company?.defaultTerms && (
            <div className="text-xs text-slate-400 leading-relaxed border-t pt-4">
              {company.defaultTerms}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
