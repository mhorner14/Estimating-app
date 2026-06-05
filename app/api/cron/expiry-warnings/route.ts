import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ ok: true, sent: 0, reason: "No email key" });
  }

  const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // Find estimates expiring in the next 3 days that haven't been acted on
  const expiringSoon = await prisma.estimate.findMany({
    where: {
      status: { in: ["SENT", "VIEWED"] },
      validUntil: { gte: tomorrow, lte: threeDaysFromNow },
    },
    include: {
      project: { include: { customer: true } },
      company: { select: { name: true, email: true, phone: true } },
      proposal: { select: { publicToken: true } },
    },
  });

  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@proestimate.app";
  let sent = 0;

  for (const estimate of expiringSoon) {
    const customerEmail = estimate.project.customer.email;
    if (!customerEmail) continue;

    const daysLeft = Math.ceil((new Date(estimate.validUntil!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const proposalUrl = estimate.proposal?.publicToken
      ? `${process.env.NEXT_PUBLIC_APP_URL}/proposal/${estimate.proposal.publicToken}`
      : null;

    if (!proposalUrl) continue;

    try {
      await resend.emails.send({
        from: `${estimate.company.name} <${fromEmail}>`,
        to: customerEmail,
        subject: `Your proposal expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""} — ${estimate.estimateNumber}`,
        html: `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1e293b;">
  <div style="background:#0f172a;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="color:white;margin:0;font-size:20px;">${estimate.company.name}</h1>
  </div>
  <div style="background:white;border:1px solid #e2e8f0;border-top:none;padding:32px;border-radius:0 0 12px 12px;">
    <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:16px;margin-bottom:24px;text-align:center;">
      <p style="margin:0;font-weight:600;color:#92400e;">⏰ Your proposal expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}!</p>
    </div>
    <p style="color:#475569;line-height:1.6;margin:0 0 16px;">Hi ${estimate.project.customer.name},</p>
    <p style="color:#475569;line-height:1.6;margin:0 0 24px;">
      Just a reminder that your proposal from ${estimate.company.name} (${estimate.estimateNumber}) is expiring soon.
      Lock in your price before it expires — pricing may change after the expiry date.
    </p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${proposalUrl}" style="background:#2563eb;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">View & Accept Proposal</a>
    </div>
    ${estimate.company.phone ? `<p style="color:#94a3b8;font-size:13px;text-align:center;">Questions? Call us at ${estimate.company.phone}</p>` : ""}
  </div>
</body></html>`,
      });
      sent++;
    } catch {
      // Continue on failure
    }
  }

  return NextResponse.json({ ok: true, sent, checked: expiringSoon.length });
}
