import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  const balanceDueJobs = await prisma.estimate.findMany({
    where: {
      status: "BALANCE_DUE",
      updatedAt: { lt: threeDaysAgo },
    },
    include: {
      project: { include: { customer: true } },
      company: true,
      payments: { where: { status: "PAID" } },
    },
  });

  let sent = 0;

  for (const job of balanceDueJobs) {
    const customerEmail = job.project.customer.email;
    if (!customerEmail || !process.env.RESEND_API_KEY) continue;

    const recentReminder = await prisma.activityLog.findFirst({
      where: {
        entityId: job.id,
        action: "balance_reminder_sent",
        createdAt: { gte: threeDaysAgo },
      },
    });
    if (recentReminder) continue;

    const paidAmount = job.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const balance = Number(job.balanceDue);

    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://proestimate.app";
      const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@proestimate.app";

      const proposal = await prisma.proposal.findUnique({ where: { estimateId: job.id }, select: { publicToken: true } });
      const paymentUrl = proposal ? `${appUrl}/proposal/${proposal.publicToken}` : null;

      await resend.emails.send({
        from: fromEmail,
        to: customerEmail,
        subject: `Balance due — ${job.company.name}`,
        html: `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1e293b;">
<h2>Balance Due — ${job.estimateNumber}</h2>
<p>Hi ${job.project.customer.name},</p>
<p>Your project with <strong>${job.company.name}</strong> is complete — thank you for your business!</p>
<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0;text-align:center;">
  <p style="color:#64748b;margin:0 0 4px;font-size:14px;">Balance Due</p>
  <p style="font-size:28px;font-weight:700;color:#dc2626;margin:0">$${balance.toFixed(2)}</p>
</div>
${paymentUrl ? `<a href="${paymentUrl}" style="background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:8px">Pay Balance Online</a>` : ""}
<p style="margin-top:16px">If you have any questions, please contact us:</p>
${job.company.phone ? `<p><strong>Phone:</strong> ${job.company.phone}</p>` : ""}
${job.company.email ? `<p><strong>Email:</strong> ${job.company.email}</p>` : ""}
<p style="color:#94a3b8;font-size:12px;margin-top:24px;">${job.company.name}</p>
</body></html>`,
      });

      await prisma.activityLog.create({
        data: {
          entityType: "estimate",
          entityId: job.id,
          action: "balance_reminder_sent",
          metadata: { to: customerEmail, balance },
        },
      });

      sent++;
    } catch {
      // non-fatal
    }
  }

  return NextResponse.json({ sent, checked: balanceDueJobs.length });
}
