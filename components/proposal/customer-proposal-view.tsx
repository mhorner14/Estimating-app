"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, MapPin, Phone, Mail, CheckCircle, PenLine, DollarSign, Loader2, AlertCircle, CreditCard, Printer } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface CustomerProposalViewProps {
  proposal: any;
}

export function CustomerProposalView({ proposal }: CustomerProposalViewProps) {
  const { toast } = useToast();
  const estimate = proposal.estimate;
  const company = estimate.company;
  const customer = estimate.project.customer;

  const [signerName, setSignerName] = useState(customer.name || "");
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [payingDeposit, setPayingDeposit] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const isAlreadySigned = !!estimate.signature;

  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const paymentStatus = searchParams?.get("payment");

  async function handlePayDeposit(paymentType: "DEPOSIT" | "BALANCE" | "FULL") {
    setPayingDeposit(true);
    try {
      const res = await fetch(`/api/proposals/${proposal.id}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentType }),
      });
      if (!res.ok) throw new Error("Failed");
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      toast({ title: "Error", description: "Could not initiate payment. Please try again.", variant: "destructive" });
      setPayingDeposit(false);
    }
  }

  function getPos(canvas: HTMLCanvasElement, e: React.MouseEvent | React.TouchEvent) {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    };
  }

  function startDraw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDrawing(true);
    setHasSigned(true);
    lastPos.current = getPos(canvas, e);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas || !lastPos.current) return;
    const ctx = canvas.getContext("2d")!;
    const pos = getPos(canvas, e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
    lastPos.current = pos;
  }

  function stopDraw() {
    setIsDrawing(false);
    lastPos.current = null;
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  }

  async function handleAccept() {
    if (!signerName || !hasSigned || !termsAccepted) return;
    setSubmitting(true);

    const canvas = canvasRef.current!;
    const signatureData = canvas.toDataURL("image/png");

    try {
      const res = await fetch(`/api/proposals/${proposal.id}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signerName, signatureData, termsAccepted }),
      });

      if (!res.ok) throw new Error("Failed to accept");
      setAccepted(true);
      toast({ title: "Proposal accepted!", description: "Thank you for your signature." });
    } catch {
      toast({ title: "Error", description: "Failed to submit signature", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  if (accepted || isAlreadySigned) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Proposal Accepted!</h1>
          <p className="text-slate-600 mb-4">
            Thank you, {isAlreadySigned ? estimate.signature.signerName : signerName}. Your proposal has been accepted and signed.
          </p>
          <p className="text-slate-600 mb-6">
            A copy has been saved. You&apos;ll be contacted soon to schedule your project.
          </p>
          {Number(estimate.depositAmount) > 0 && (
            <div className="space-y-3">
              <div className="p-4 bg-white border border-slate-200 rounded-lg text-sm text-center">
                <p className="text-slate-500 mb-1">Deposit Due</p>
                <p className="text-2xl font-bold text-blue-700">{formatCurrency(Number(estimate.depositAmount))}</p>
              </div>
              <Button
                size="lg"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => handlePayDeposit("DEPOSIT")}
                disabled={payingDeposit}
              >
                {payingDeposit ? (
                  <><Loader2 className="mr-2 w-4 h-4 animate-spin" /> Redirecting...</>
                ) : (
                  <><CreditCard className="mr-2 w-4 h-4" /> Pay Deposit Now</>
                )}
              </Button>
              <p className="text-xs text-slate-500 text-center">Secure payment powered by Stripe</p>
            </div>
          )}
          {isAlreadySigned && estimate.signature && (
            <div className="p-4 bg-white border rounded-lg text-left text-sm mt-4">
              <p className="text-slate-500">Signed by <strong>{estimate.signature.signerName}</strong></p>
              <p className="text-slate-500">On {formatDate(estimate.signature.signedAt)}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      <div className="max-w-3xl mx-auto py-8 px-4 print:py-0 print:px-0">
        <div className="flex justify-end mb-4 print:hidden">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / Save PDF
          </button>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-slate-900 text-white p-8">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  {company?.logo ? (
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center p-1 shrink-0">
                      <img src={company.logo} alt={company.name} className="max-w-full max-h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <div>
                    <p className="text-xl font-bold">{company?.name}</p>
                    {company?.licenseNumber && (
                      <p className="text-slate-400 text-sm">License #{company.licenseNumber}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-1 text-sm text-slate-300">
                  {company?.phone && (
                    <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> {company.phone}</div>
                  )}
                  {company?.email && (
                    <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> {company.email}</div>
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
            {estimate.validUntil && (() => {
              const expiry = new Date(estimate.validUntil);
              const isExpired = expiry < new Date();
              const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              if (isExpired) {
                return (
                  <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                    <p className="text-sm font-medium">This proposal expired on {expiry.toLocaleDateString()}. Please contact us for an updated quote.</p>
                  </div>
                );
              }
              if (daysLeft <= 7) {
                return (
                  <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                    <p className="text-sm font-medium">This proposal expires in {daysLeft} day{daysLeft !== 1 ? "s" : ""} on {expiry.toLocaleDateString()}.</p>
                  </div>
                );
              }
              return null;
            })()}

            {paymentStatus === "success" && (
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
                <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                <p className="text-sm font-medium">Payment received — thank you! We&apos;ll be in touch to schedule your project.</p>
              </div>
            )}

            {/* Customer Info */}
            <div className="grid grid-cols-2 gap-6 p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Prepared For</p>
                <p className="font-semibold">{customer.name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Project Location</p>
                <div className="flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 mt-0.5" />
                  <p className="text-sm text-slate-700">{customer.projectAddress || "Address on file"}</p>
                </div>
              </div>
            </div>

            {estimate.proposalTitle && (
              <h2 className="text-xl font-bold text-slate-900">{estimate.proposalTitle}</h2>
            )}

            {estimate.scopeOfWork && (
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Scope of Work</h3>
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{estimate.scopeOfWork}</p>
              </div>
            )}

            {estimate.prepSteps && (
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Surface Preparation</h3>
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{estimate.prepSteps}</p>
              </div>
            )}

            {estimate.productsIncluded && (
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">System & Products</h3>
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{estimate.productsIncluded}</p>
              </div>
            )}

            {estimate.colorSelection && (
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1">Color Selection</h3>
                <p className="text-slate-700">{estimate.colorSelection}</p>
              </div>
            )}

            {estimate.photos && estimate.photos.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Project Photos</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {estimate.photos.map((photo: any) => (
                    <div key={photo.id} className="rounded-lg overflow-hidden bg-slate-100 aspect-square">
                      <img src={photo.url} alt={photo.caption || "Project photo"} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Pricing */}
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Investment Summary</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-semibold text-slate-700">Description</th>
                    <th className="text-right py-2 font-semibold text-slate-700">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {estimate.lineItems.filter((i: any) => !i.isOptional).map((item: any) => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="py-3 text-slate-700">{item.description}</td>
                      <td className="py-3 text-right font-medium">{formatCurrency(item.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 space-y-2">
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

            {/* Payment */}
            <div className="grid grid-cols-2 gap-4 p-4 border border-blue-100 bg-blue-50 rounded-lg">
              <div className="text-center">
                <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-1">Deposit Due Today</p>
                <p className="text-2xl font-bold text-blue-700">{formatCurrency(estimate.depositAmount)}</p>
                <p className="text-xs text-blue-600 mt-1">Due upon acceptance</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-600 font-semibold uppercase tracking-wide mb-1">Balance Due</p>
                <p className="text-2xl font-bold text-slate-700">{formatCurrency(estimate.balanceDue)}</p>
                <p className="text-xs text-slate-600 mt-1">Due upon completion</p>
              </div>
            </div>

            {Number(estimate.depositAmount) > 0 && !isAlreadySigned && paymentStatus !== "success" && (
              <div className="space-y-2">
                <Button
                  size="lg"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => handlePayDeposit("DEPOSIT")}
                  disabled={payingDeposit}
                >
                  {payingDeposit ? (
                    <><Loader2 className="mr-2 w-4 h-4 animate-spin" /> Redirecting to payment...</>
                  ) : (
                    <><CreditCard className="mr-2 w-4 h-4" /> Pay Deposit — {formatCurrency(Number(estimate.depositAmount))}</>
                  )}
                </Button>
                <p className="text-xs text-center text-slate-500">Secure payment powered by Stripe</p>
              </div>
            )}

            {estimate.warrantyText && (
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Warranty</h3>
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{estimate.warrantyText}</p>
              </div>
            )}

            {estimate.exclusions && (
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Exclusions</h3>
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{estimate.exclusions}</p>
              </div>
            )}

            <Separator />

            {/* Signature Section */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                <PenLine className="w-5 h-5 text-blue-600" />
                Accept & Sign
              </h3>
              <p className="text-slate-600 text-sm mb-6">
                By signing below, you agree to the scope, pricing, and terms outlined in this proposal.
              </p>

              <div className="space-y-4">
                <div>
                  <Label>Your Full Name</Label>
                  <Input
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    placeholder="Type your full name"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Signature</Label>
                  <div className="mt-1 border-2 border-dashed border-slate-300 rounded-lg p-1 bg-white relative">
                    <canvas
                      ref={canvasRef}
                      width={600}
                      height={150}
                      className="w-full touch-none cursor-crosshair"
                      onMouseDown={startDraw}
                      onMouseMove={draw}
                      onMouseUp={stopDraw}
                      onMouseLeave={stopDraw}
                      onTouchStart={startDraw}
                      onTouchMove={draw}
                      onTouchEnd={stopDraw}
                    />
                    {!hasSigned && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <p className="text-slate-400 text-sm">Draw your signature here</p>
                      </div>
                    )}
                  </div>
                  {hasSigned && (
                    <Button variant="ghost" size="sm" onClick={clearSignature} className="mt-1 text-xs text-slate-500">
                      Clear signature
                    </Button>
                  )}
                </div>

                <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5"
                  />
                  <label htmlFor="terms" className="text-sm text-slate-600 cursor-pointer">
                    I have read and agree to the scope of work, pricing, warranty terms, and payment terms outlined in this proposal.
                    {company?.defaultTerms && (
                      <span className="block mt-1 text-xs text-slate-500">{company.defaultTerms}</span>
                    )}
                  </label>
                </div>

                {(!signerName || !hasSigned || !termsAccepted) && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <AlertCircle className="w-4 h-4" />
                    Please enter your name, draw your signature, and accept the terms to proceed.
                  </div>
                )}

                <Button
                  size="lg"
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleAccept}
                  disabled={!signerName || !hasSigned || !termsAccepted || submitting}
                >
                  {submitting ? (
                    <><Loader2 className="mr-2 w-4 h-4 animate-spin" /> Processing...</>
                  ) : (
                    <><CheckCircle className="mr-2 w-4 h-4" /> Accept Proposal & Sign</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
