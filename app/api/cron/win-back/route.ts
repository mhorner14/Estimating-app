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
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@proestimate.app";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://proestimate.app";

  // Find SENT/VIEWED estimates that are 30-45 days old (prime win-back window)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const fortyFiveDaysAgo = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);

  const candidates = await prisma.estimate.findMany({
    where: {
      status: { in: ["SENT", "VIEWED"] },
      sentAt: { gte: fortyFiveDaysAgo, lte: thirtyDaysAgo },
      project: { customer: { email: { not: undefined } } },
    },
    include: {
      project: { include: { customer: true } },
      company: { select: { name: true, phone: true, email: true, accentColor: true } },
      proposal: { select: { publicToken: true } },
    },
    take: 50,
  });

  let sent = 0;

  for (const estimate of candidates) {
    const email = estimate.project.customer.email;
    if (!email) continue;

    // Check if we already sent a win-back for this estimate
    const alreadySent = await prisma.activityLog.findFirst({
      where: { entityId: estimate.id, action: "win_back_sent" },
    });
    if (alreadySent) continue;

    const customerName = estimate.project.customer.name;
    const companyName = estimate.company.name;
    const accentColor = estimate.company.accentColor || "#0f172a";
    const proposalToken = estimate.proposal?.publicToken;

    try {
      await resend.emails.send({
        from: `${companyName} <${fromEmail}>`,
        to: email,
        subject: `Still thinking about your project? — ${companyName}`,
        html: `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1e293b;background:#f8fafc;">
  <div style="background:${accentColor};padding:24px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="color:white;margin:0;font-size:18px;font-weight:700;">${companyName}</h1>
  </div>
  <div style="background:white;border:1px solid #e2e8f0;border-top:none;padding:32px;border-radius:0 0 12px 12px;">
    <p style="font-size:16px;margin:0 0 16px;">Hi ${customerName},</p>
    <p style="color:#475569;line-height:1.7;margin:0 0 16px;">
      We sent you a proposal about a month ago and wanted to check in.
      We understand timing isn't always right — but if you're still considering the project, we'd love to help.
    </p>
    <p style="color:#475569;line-height:1.7;margin:0 0 24px;">
      Your proposal is still on file. If you have any questions or would like to discuss updates to the scope or pricing, just reply to this email — we're happy to work with you.
    </p>
    ${proposalToken ? `<div style="text-align:center;margin:28px 0;">
      <a href="${appUrl}/proposal/${proposalToken}" style="display:inline-block;background:${accentColor};color:white;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">
        View Your Proposal →
      </a>
    </div>` : ""}
    ${estimate.company.phone ? `<p style="color:#94a3b8;font-size:13px;text-align:center;margin-top:20px;">Questions? Call us: ${estimate.company.phone}</p>` : ""}
  </div>
</body></html>`,
      });

      await prisma.activityLog.create({
        data: {
          entityType: "estimate",
          entityId: estimate.id,
          action: "win_back_sent",
          metadata: { customerEmail: email, sentAt: new Date().toISOString() },
        },
      });

      sent++;
    } catch {
      // Non-fatal
    }
  }

  return NextResponse.json({ ok: true, sent });
}
