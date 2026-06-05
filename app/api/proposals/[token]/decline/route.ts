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

  const estimate = proposal.estimate;
  if (["ACCEPTED", "DEPOSIT_PAID", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "PAID_IN_FULL"].includes(estimate.status)) {
    return NextResponse.json({ error: "This proposal has already been accepted" }, { status: 400 });
  }

  const { reason } = await req.json();

  await prisma.estimate.update({
    where: { id: estimate.id },
    data: { status: "LOST", lostReason: reason || "Customer declined via proposal" },
  });

  await prisma.activityLog.create({
    data: {
      entityType: "estimate",
      entityId: estimate.id,
      action: "proposal_declined",
      metadata: { reason: reason || null, customerName: estimate.project.customer.name },
    },
  });

  // Notify contractor
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@proestimate.app";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://proestimate.app";

    const ownerUser = await prisma.user.findFirst({
      where: { companyId: estimate.company.id, role: { in: ["OWNER", "ADMIN"] }, email: { not: undefined } },
    });

    if (ownerUser?.email) {
      resend.emails.send({
        from: `ProEstimate <${fromEmail}>`,
        to: ownerUser.email,
        subject: `Proposal declined — ${estimate.estimateNumber}`,
        html: `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1e293b;">
  <div style="background:#7f1d1d;padding:20px;border-radius:12px 12px 0 0;">
    <h1 style="color:white;margin:0;font-size:16px;">Proposal Declined</h1>
  </div>
  <div style="background:white;border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 12px 12px;">
    <p style="color:#475569;margin:0 0 16px;"><strong>${estimate.project.customer.name}</strong> has declined proposal ${estimate.estimateNumber}.</p>
    ${reason ? `<div style="background:#fef2f2;border-left:3px solid #ef4444;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:16px;">
      <p style="margin:0;color:#7f1d1d;font-style:italic;">"${reason}"</p>
    </div>` : ""}
    <a href="${appUrl}/estimates/${estimate.id}" style="display:inline-block;background:#0f172a;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px;">
      View Estimate →
    </a>
  </div>
</body></html>`,
      }).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true });
}
