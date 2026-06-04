import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as any).companyId;

  const estimate = await prisma.estimate.findFirst({
    where: { id, companyId },
    include: {
      project: { include: { customer: true } },
      proposal: true,
      company: true,
    },
  });

  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const customer = estimate.project.customer;
  const email = customer.email;

  if (!email) {
    return NextResponse.json({ error: "Customer has no email address" }, { status: 400 });
  }

  if (!estimate.proposal?.publicToken) {
    return NextResponse.json({ error: "No proposal generated yet" }, { status: 400 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ error: "Email not configured" }, { status: 400 });
  }

  const proposalUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://proestimate.app"}/proposal/${estimate.proposal.publicToken}`;
  const companyName = estimate.company?.name || "Your Contractor";

  const { Resend } = await import("resend");
  const resend = new Resend(resendKey);
  const fromEmail = process.env.RESEND_FROM_EMAIL || "proposals@proestimate.app";

  const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

  await resend.emails.send({
    from: fromEmail,
    to: email,
    subject: `Following up: Your proposal from ${companyName}`,
    html: `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
  <div style="background: #0f172a; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 20px;">${companyName}</h1>
  </div>
  <div style="background: white; border: 1px solid #e2e8f0; border-top: none; padding: 32px; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px; margin: 0 0 16px;">Hi ${customer.name},</p>
    <p style="color: #475569; line-height: 1.6; margin: 0 0 24px;">
      I wanted to follow up on the proposal I sent you for your project (${estimate.estimateNumber}).
      Please let me know if you have any questions or if there's anything I can adjust.
    </p>
    <p style="color: #475569; line-height: 1.6; margin: 0 0 24px;">
      Your proposal total is <strong>${formatter.format(Number(estimate.totalAmount))}</strong> with a deposit of <strong>${formatter.format(Number(estimate.depositAmount))}</strong>.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${proposalUrl}" style="background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
        View Proposal
      </a>
    </div>
    <p style="color: #94a3b8; font-size: 13px; margin: 24px 0 0;">
      Looking forward to hearing from you. — ${companyName}
    </p>
  </div>
</body>
</html>`,
  });

  await prisma.activityLog.create({
    data: {
      userId: session.user.id,
      entityType: "estimate",
      entityId: id,
      action: "follow_up_sent",
      metadata: { to: email },
    },
  });

  return NextResponse.json({ ok: true });
}
