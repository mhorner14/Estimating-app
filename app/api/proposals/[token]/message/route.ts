import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const proposal = await prisma.proposal.findUnique({
    where: { publicToken: token },
    include: {
      estimate: {
        include: {
          project: { include: { customer: true } },
          company: true,
        },
      },
    },
  });

  if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { message, senderName } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: "Message required" }, { status: 400 });

  const estimate = proposal.estimate;
  const company = estimate.company;
  const customer = estimate.project.customer;

  // Save as a note on the estimate
  await prisma.note.create({
    data: {
      estimateId: estimate.id,
      content: `**Customer Message** from ${senderName || customer.name}:\n\n${message}`,
      isInternal: false,
    },
  });

  await prisma.activityLog.create({
    data: {
      entityType: "estimate",
      entityId: estimate.id,
      action: "customer_message",
      metadata: { senderName: senderName || customer.name, message: message.slice(0, 200) },
    },
  });

  // Notify contractor
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@proestimate.app";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://proestimate.app";

    const ownerUser = await prisma.user.findFirst({
      where: { companyId: company.id, role: { in: ["OWNER", "ADMIN"] }, email: { not: undefined } },
    });

    if (ownerUser?.email) {
      resend.emails.send({
        from: `ProEstimate <${fromEmail}>`,
        to: ownerUser.email,
        subject: `Customer message on proposal ${estimate.estimateNumber}`,
        html: `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1e293b;">
  <div style="background:#0f172a;padding:20px;border-radius:12px 12px 0 0;">
    <h1 style="color:white;margin:0;font-size:16px;">New Customer Message</h1>
  </div>
  <div style="background:white;border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 12px 12px;">
    <p style="color:#64748b;margin:0 0 8px;font-size:13px;">From: <strong>${senderName || customer.name}</strong> · Estimate ${estimate.estimateNumber}</p>
    <div style="background:#f8fafc;border-left:3px solid #3b82f6;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:20px;">
      <p style="margin:0;color:#1e293b;line-height:1.6;white-space:pre-wrap;">${message}</p>
    </div>
    <a href="${appUrl}/estimates/${estimate.id}" style="display:inline-block;background:#0f172a;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px;">
      View Estimate & Reply →
    </a>
  </div>
</body></html>`,
      }).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true });
}
