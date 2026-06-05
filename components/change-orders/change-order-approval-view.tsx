"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Building2, CheckCircle, PenLine, Loader2, AlertCircle, XCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface ChangeOrderData {
  id: string;
  number: string;
  description: string;
  amount: number;
  status: string;
  lineItems: Array<{ description: string; quantity: number; unit: string; totalPrice: number }>;
  company: { name: string; logo: string | null; phone: string | null; email: string | null };
  customer: { name: string };
  estimateNumber: string;
  token: string;
}

export function ChangeOrderApprovalView({ data }: { data: ChangeOrderData }) {
  const { toast } = useToast();
  const [signerName, setSignerName] = useState(data.customer.name);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [rejected, setRejected] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  function getPos(canvas: HTMLCanvasElement, e: React.MouseEvent | React.TouchEvent) {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  }

  function startDraw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDrawing(true); setHasSigned(true);
    lastPos.current = getPos(canvas, e);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas || !lastPos.current) return;
    const ctx = canvas.getContext("2d")!;
    const pos = getPos(canvas, e);
    ctx.beginPath(); ctx.moveTo(lastPos.current.x, lastPos.current.y); ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1e293b"; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.stroke();
    lastPos.current = pos;
  }

  function stopDraw() { setIsDrawing(false); lastPos.current = null; }

  function clearSignature() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  }

  async function handleApprove() {
    if (!signerName || !hasSigned) return;
    setSubmitting(true);
    const signatureData = canvasRef.current!.toDataURL("image/png");
    try {
      const res = await fetch(`/api/change-orders/${data.token}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signerName, signatureData }),
      });
      if (!res.ok) throw new Error("Failed");
      setDone(true);
    } catch {
      toast({ title: "Error", description: "Failed to submit approval", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  if (data.status === "APPROVED" || done) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-xl font-bold">Change Order Approved</h1>
          <p className="text-slate-500 text-sm mt-2">Thank you! Change order {data.number} has been approved and signed.</p>
        </div>
      </div>
    );
  }

  if (data.status === "REJECTED" || rejected) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold">Change Order Declined</h1>
          <p className="text-slate-500 text-sm mt-2">You've declined change order {data.number}. Your contractor will be notified.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="bg-slate-900 text-white p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {data.company.logo ? (
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center p-1">
                    <img src={data.company.logo} alt={data.company.name} className="max-w-full max-h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                )}
                <div>
                  <p className="font-bold">{data.company.name}</p>
                  {data.company.phone && <p className="text-slate-400 text-sm">{data.company.phone}</p>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-xs">Change Order</p>
                <p className="font-bold">{data.number}</p>
                <p className="text-slate-400 text-xs mt-1">Ref: #{data.estimateNumber}</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Prepared For</p>
              <p className="font-semibold">{data.customer.name}</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Change Order Description</h3>
              <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{data.description}</p>
            </div>

            {data.lineItems.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Additional Work</h3>
                <table className="w-full text-sm">
                  <tbody>
                    {data.lineItems.map((li, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="py-2 text-slate-700">{li.description}</td>
                        <td className="py-2 text-right font-medium">{formatCurrency(li.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <Separator />

            <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="font-semibold text-slate-900">Additional Amount</p>
              <p className="text-2xl font-bold text-blue-700">{formatCurrency(data.amount)}</p>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <PenLine className="w-5 h-5 text-blue-600" /> Approve & Sign
              </h3>
              <div className="space-y-4">
                <div>
                  <Label>Your Full Name</Label>
                  <Input value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Full name" className="mt-1" />
                </div>
                <div>
                  <Label>Signature</Label>
                  <div className="mt-1 border-2 border-dashed border-slate-300 rounded-lg p-1 bg-white relative">
                    <canvas
                      ref={canvasRef} width={600} height={120}
                      className="w-full touch-none cursor-crosshair"
                      onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                      onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
                    />
                    {!hasSigned && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <p className="text-slate-400 text-sm">Draw signature here</p>
                      </div>
                    )}
                  </div>
                  {hasSigned && (
                    <Button variant="ghost" size="sm" onClick={clearSignature} className="mt-1 text-xs text-slate-500">Clear</Button>
                  )}
                </div>

                {(!signerName || !hasSigned) && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <AlertCircle className="w-4 h-4" /> Enter your name and draw your signature to approve.
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => setRejected(true)}
                  >
                    <XCircle className="w-4 h-4 mr-2" /> Decline
                  </Button>
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleApprove}
                    disabled={!signerName || !hasSigned || submitting}
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                    Approve Change Order
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
