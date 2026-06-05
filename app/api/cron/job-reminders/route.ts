import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(23, 59, 59, 999);

  const jobs = await prisma.estimate.findMany({
    where: {
      scheduledDate: { gte: tomorrow, lte: tomorrowEnd },
      status: { in: ["SCHEDULED", "DEPOSIT_PAID", "IN_PROGRESS"] },
    },
    include: {
      project: { include: { customer: true } },
      company: true,
    },
  });

  let sent = 0;

  for (const job of jobs) {
    const customerEmail = job.project.customer.email;
    if (!customerEmail || !process.env.RESEND_API_KEY) continue;

    // Check if reminder already sent
    const existing = await prisma.activityLog.findFirst({
      where: {
        entityId: job.id,
        action: "job_reminder_sent",
        createdAt: { gte: new Date(Date.now() - 20 * 60 * 60 * 1000) }, // within 20h
      },
    });
    if (existing) continue;

    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@proestimate.app";

      const scheduledStr = new Date(job.scheduledDate!).toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric",
      });

      await resend.emails.send({
        from: fromEmail,
        to: customerEmail,
        subject: `Your ${job.company.name} appointment is tomorrow — ${scheduledStr}`,
        html: `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1e293b;">
<h2>Your appointment is tomorrow!</h2>
<p>Hi ${job.project.customer.name},</p>
<p>This is a friendly reminder that your appointment with <strong>${job.company.name}</strong> is scheduled for:</p>
<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:16px 0;text-align:center;">
  <p style="font-size:20px;font-weight:700;color:#1d4ed8;margin:0">${scheduledStr}</p>
  ${job.project.customer.projectAddress ? `<p style="color:#475569;margin:4px 0 0">${job.project.customer.projectAddress}</p>` : ""}
</div>
<p>If you need to reschedule, please contact us:</p>
${job.company.phone ? `<p><strong>Phone:</strong> ${job.company.phone}</p>` : ""}
${job.company.email ? `<p><strong>Email:</strong> ${job.company.email}</p>` : ""}
<p style="color:#94a3b8;font-size:12px;margin-top:24px;">${job.company.name}</p>
</body></html>`,
      });

      await prisma.activityLog.create({
        data: {
          entityType: "estimate",
          entityId: job.id,
          action: "job_reminder_sent",
          metadata: { to: customerEmail },
        },
      });

      sent++;
    } catch {
      // non-fatal
    }
  }

  return NextResponse.json({ sent, checked: jobs.length });
}
