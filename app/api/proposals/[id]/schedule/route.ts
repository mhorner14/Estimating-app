import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { scheduledDate } = await req.json();

  const proposal = await prisma.proposal.findUnique({
    where: { id },
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

  const estimate = proposal.estimate;

  await prisma.estimate.update({
    where: { id: estimate.id },
    data: { scheduledDate: new Date(scheduledDate) },
  });

  // Notify contractor
  if (estimate.company?.email && process.env.RESEND_API_KEY) {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.RESEND_FROM_EMAIL || "proposals@proestimate.app";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://proestimate.app";
    const d = new Date(scheduledDate);
    const dateStr = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

    await resend.emails.send({
      from: fromEmail,
      to: estimate.company.email,
      subject: `📅 ${estimate.project.customer.name} requested ${dateStr}`,
      html: `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1e293b;">
  <h2>Job Date Request</h2>
  <p><strong>${estimate.project.customer.name}</strong> has requested <strong>${dateStr}</strong> as their preferred start date for estimate <strong>${estimate.estimateNumber}</strong>.</p>
  <p>Please confirm the date and reach out to finalize the time.</p>
  <a href="${appUrl}/estimates/${estimate.id}" style="background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:12px">View Estimate</a>
</body></html>`,
    }).catch(() => {});
  }

  await prisma.activityLog.create({
    data: {
      entityType: "estimate",
      entityId: estimate.id,
      action: "date_requested",
      metadata: { scheduledDate, customerName: estimate.project.customer.name },
    },
  });

  return NextResponse.json({ ok: true });
}
