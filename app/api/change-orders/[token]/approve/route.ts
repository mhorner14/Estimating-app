import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { signerName, signatureData } = await req.json();

  const co = await prisma.changeOrder.findUnique({
    where: { publicToken: token },
    include: { estimate: { include: { company: true, project: { include: { customer: true } } } } },
  });

  if (!co || co.status !== "PENDING") {
    return NextResponse.json({ error: "Change order not found or already processed" }, { status: 400 });
  }

  await prisma.changeOrder.update({
    where: { id: co.id },
    data: { status: "APPROVED", approvedAt: new Date(), signerName, signatureData },
  });

  // Notify contractor
  if (co.estimate.company.email && process.env.RESEND_API_KEY) {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://proestimate.app";
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "noreply@proestimate.app",
      to: co.estimate.company.email,
      subject: `✅ Change Order ${co.number} approved by ${co.estimate.project.customer.name}`,
      html: `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1e293b;">
<h2>Change Order Approved</h2>
<p><strong>${co.estimate.project.customer.name}</strong> has approved change order <strong>${co.number}</strong> for $${Number(co.amount).toFixed(2)}.</p>
<a href="${appUrl}/estimates/${co.estimateId}" style="background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:12px">View Estimate</a>
</body></html>`,
    }).catch(() => {});
  }

  return NextResponse.json({ success: true });
}
