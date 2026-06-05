import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string; coId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = (session.user as any).companyId;
  const { id, coId } = await params;

  const estimate = await prisma.estimate.findFirst({
    where: { id, companyId },
    include: { project: { include: { customer: true } }, company: true },
  });
  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const co = await prisma.changeOrder.findFirst({ where: { id: coId, estimateId: id } });
  if (!co) return NextResponse.json({ error: "Change order not found" }, { status: 404 });

  const customerEmail = estimate.project.customer.email;
  if (!customerEmail) return NextResponse.json({ error: "Customer has no email" }, { status: 400 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://proestimate.app";
  const approvalUrl = `${appUrl}/change-order/${co.publicToken}`;

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@proestimate.app";

  const lineItems = (co.lineItems as any[]) || [];
  const lineItemsHtml = lineItems.length
    ? `<table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px;">${lineItems.map((li: any) => `<tr><td style="padding:4px 8px;border-bottom:1px solid #e2e8f0">${li.description}</td><td style="padding:4px 8px;border-bottom:1px solid #e2e8f0;text-align:right">$${Number(li.totalPrice || 0).toFixed(2)}</td></tr>`).join("")}</table>`
    : "";

  await resend.emails.send({
    from: fromEmail,
    to: customerEmail,
    subject: `Change Order ${co.number} — ${estimate.company.name}`,
    html: `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1e293b;">
<h2>Change Order ${co.number}</h2>
<p>Hi ${estimate.project.customer.name},</p>
<p>A change order has been issued for your project (#${estimate.estimateNumber}).</p>
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
  <p style="margin:0 0 8px 0;white-space:pre-wrap;color:#475569">${co.description}</p>
  ${lineItemsHtml}
  <p style="margin-top:12px;font-size:18px;font-weight:700;">Additional Amount: $${Number(co.amount).toFixed(2)}</p>
</div>
<p>Please review and approve this change order:</p>
<a href="${approvalUrl}" style="background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:8px">Review & Approve</a>
<p style="color:#94a3b8;font-size:12px;margin-top:24px;">${estimate.company.name}${estimate.company.phone ? ` · ${estimate.company.phone}` : ""}</p>
</body></html>`,
  });

  await prisma.changeOrder.update({ where: { id: coId }, data: { sentAt: new Date() } });
  return NextResponse.json({ success: true });
}
