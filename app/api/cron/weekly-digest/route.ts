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

  const companies = await prisma.company.findMany({
    where: { email: { not: null } },
    include: { users: { where: { role: { in: ["OWNER", "ADMIN"] } }, take: 1 } },
  });

  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail = process.env.RESEND_FROM_EMAIL || "digest@proestimate.app";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://proestimate.app";

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const prevWeek = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const WON = ["ACCEPTED", "DEPOSIT_PAID", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "BALANCE_DUE", "PAID_IN_FULL"];

  let sent = 0;

  for (const company of companies) {
    const recipientEmail = company.email;
    if (!recipientEmail) continue;

    const [thisWeekEstimates, prevWeekEstimates, pendingEstimates, todayJobs] = await Promise.all([
      prisma.estimate.findMany({
        where: { companyId: company.id, createdAt: { gte: weekAgo } },
        select: { status: true, totalAmount: true },
      }),
      prisma.estimate.findMany({
        where: { companyId: company.id, createdAt: { gte: prevWeek, lt: weekAgo } },
        select: { status: true, totalAmount: true },
      }),
      prisma.estimate.findMany({
        where: { companyId: company.id, status: { in: ["SENT", "VIEWED"] } },
        select: { id: true },
      }),
      prisma.estimate.count({
        where: {
          companyId: company.id,
          status: { in: ["SCHEDULED", "IN_PROGRESS"] },
          scheduledDate: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
    ]);

    const thisWeekWon = thisWeekEstimates.filter((e) => WON.includes(e.status));
    const prevWeekWon = prevWeekEstimates.filter((e) => WON.includes(e.status));
    const thisWeekRevenue = thisWeekWon.reduce((s, e) => s + Number(e.totalAmount), 0);
    const prevWeekRevenue = prevWeekWon.reduce((s, e) => s + Number(e.totalAmount), 0);
    const revChange = prevWeekRevenue > 0 ? Math.round(((thisWeekRevenue - prevWeekRevenue) / prevWeekRevenue) * 100) : null;

    const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

    const rows = [
      { label: "New estimates created", value: thisWeekEstimates.length, prev: prevWeekEstimates.length },
      { label: "Proposals won", value: thisWeekWon.length, prev: prevWeekWon.length },
      { label: "Revenue won", value: formatter.format(thisWeekRevenue), prev: formatter.format(prevWeekRevenue) },
      { label: "Pending proposals", value: pendingEstimates.length, prev: null },
      { label: "Jobs scheduled today", value: todayJobs, prev: null },
    ];

    const tableRows = rows.map((r) => `
      <tr style="border-bottom:1px solid #e2e8f0">
        <td style="padding:10px 16px;color:#475569;font-size:14px">${r.label}</td>
        <td style="padding:10px 16px;text-align:right;font-weight:600;color:#1e293b;font-size:14px">${r.value}</td>
        ${r.prev !== null ? `<td style="padding:10px 16px;text-align:right;color:#94a3b8;font-size:13px">${r.prev} prev</td>` : '<td></td>'}
      </tr>`).join("");

    try {
      await resend.emails.send({
        from: `ProEstimate <${fromEmail}>`,
        to: recipientEmail,
        subject: `📊 Your weekly summary — ${company.name}`,
        html: `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1e293b;">
  <div style="background:#0f172a;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="color:white;margin:0;font-size:20px;">${company.name}</h1>
    <p style="color:#94a3b8;margin:4px 0 0;font-size:13px">Weekly Performance Summary</p>
  </div>
  <div style="background:white;border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 12px 12px;">
    ${revChange !== null ? `
    <div style="background:${revChange >= 0 ? "#dcfce7" : "#fee2e2"};border-radius:8px;padding:16px;margin-bottom:20px;text-align:center;">
      <p style="margin:0;font-size:24px;font-weight:700;color:${revChange >= 0 ? "#16a34a" : "#dc2626"}">${revChange >= 0 ? "+" : ""}${revChange}% revenue</p>
      <p style="margin:4px 0 0;color:${revChange >= 0 ? "#166534" : "#991b1b"};font-size:13px">vs last week</p>
    </div>` : ""}
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <thead><tr style="background:#f8fafc"><th style="text-align:left;padding:10px 16px;color:#64748b;font-size:12px;text-transform:uppercase">Metric</th><th style="text-align:right;padding:10px 16px;color:#64748b;font-size:12px;text-transform:uppercase">This week</th><th style="text-align:right;padding:10px 16px;color:#64748b;font-size:12px;text-transform:uppercase">Prev</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
    <div style="text-align:center">
      <a href="${appUrl}/dashboard" style="background:#2563eb;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">View Dashboard →</a>
    </div>
  </div>
</body></html>`,
      });
      sent++;
    } catch {
      // Continue
    }
  }

  return NextResponse.json({ ok: true, sent, total: companies.length });
}
