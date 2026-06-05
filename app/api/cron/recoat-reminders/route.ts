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

  // Find jobs completed ~1 year ago (355-375 days)
  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const tenDaysBefore = new Date(oneYearAgo.getTime() - 10 * 24 * 60 * 60 * 1000);
  const tenDaysAfter = new Date(oneYearAgo.getTime() + 10 * 24 * 60 * 60 * 1000);

  const completedJobs = await prisma.estimate.findMany({
    where: {
      status: { in: ["COMPLETED", "PAID_IN_FULL"] },
      updatedAt: { gte: tenDaysBefore, lte: tenDaysAfter },
      project: { customer: { email: { not: undefined } } },
    },
    include: {
      project: { include: { customer: true } },
      company: { select: { name: true, phone: true, accentColor: true, intakeFormSlug: true } },
    },
    take: 50,
  });

  let sent = 0;

  for (const estimate of completedJobs) {
    const email = estimate.project.customer.email;
    if (!email) continue;

    const alreadySent = await prisma.activityLog.findFirst({
      where: { entityId: estimate.id, action: "recoat_reminder_sent" },
    });
    if (alreadySent) continue;

    const companyName = (estimate.company as any).name;
    const customerName = estimate.project.customer.name;
    const accentColor = (estimate.company as any).accentColor || "#0f172a";
    const intakeFormSlug = (estimate.company as any).intakeFormSlug;
    const intakeUrl = intakeFormSlug ? `${appUrl}/intake/${intakeFormSlug}` : null;

    try {
      await resend.emails.send({
        from: `${companyName} <${fromEmail}>`,
        to: email,
        subject: `Is it time to refresh your floors? — ${companyName}`,
        html: `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1e293b;background:#f8fafc;">
  <div style="background:${accentColor};padding:24px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="color:white;margin:0;font-size:18px;font-weight:700;">${companyName}</h1>
  </div>
  <div style="background:white;border:1px solid #e2e8f0;border-top:none;padding:32px;border-radius:0 0 12px 12px;">
    <p style="font-size:16px;margin:0 0 16px;">Hi ${customerName},</p>
    <p style="color:#475569;line-height:1.7;margin:0 0 16px;">
      It's been about a year since we completed your flooring project — time flies!
    </p>
    <p style="color:#475569;line-height:1.7;margin:0 0 24px;">
      Annual maintenance and a fresh top coat can keep your floors looking brand new and extend their life significantly. If you've noticed any wear or dulling, now is the perfect time for a refresh.
    </p>
    ${intakeUrl ? `<div style="text-align:center;margin:28px 0;">
      <a href="${intakeUrl}" style="display:inline-block;background:${accentColor};color:white;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">
        Request a Maintenance Quote →
      </a>
    </div>` : ""}
    <p style="color:#94a3b8;font-size:13px;text-align:center;margin-top:20px;">
      As a returning customer, you'll always get our best pricing.
      ${(estimate.company as any).phone ? `<br>Questions? Call us: ${(estimate.company as any).phone}` : ""}
    </p>
  </div>
</body></html>`,
      });

      await prisma.activityLog.create({
        data: {
          entityType: "estimate",
          entityId: estimate.id,
          action: "recoat_reminder_sent",
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
