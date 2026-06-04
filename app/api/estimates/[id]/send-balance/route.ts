import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPaymentLink } from "@/lib/stripe";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as any).companyId;

  const estimate = await prisma.estimate.findFirst({
    where: { id, companyId },
    include: {
      project: { include: { customer: true } },
      company: true,
    },
  });

  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const customer = estimate.project.customer;
  if (!customer.email) {
    return NextResponse.json({ error: "Customer has no email address" }, { status: 400 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ error: "Email not configured" }, { status: 400 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Payments not configured" }, { status: 400 });
  }

  const balanceAmount = Number(estimate.balanceDue);
  if (balanceAmount <= 0) {
    return NextResponse.json({ error: "No balance due" }, { status: 400 });
  }

  const companyName = estimate.company?.name || "Your Contractor";
  const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

  // Create a Stripe checkout session for the balance
  const { url, sessionId } = await createPaymentLink(
    balanceAmount,
    `Balance Due — ${estimate.estimateNumber}`,
    estimate.id,
    "BALANCE",
    customer.email
  );

  await prisma.payment.create({
    data: {
      estimateId: estimate.id,
      stripeSessionId: sessionId,
      amount: balanceAmount,
      type: "BALANCE",
      status: "PENDING",
    },
  });

  // Advance status to BALANCE_DUE if not already
  if (!["BALANCE_DUE", "PAID_IN_FULL"].includes(estimate.status)) {
    await prisma.estimate.update({
      where: { id },
      data: { status: "BALANCE_DUE" },
    });
  }

  const { Resend } = await import("resend");
  const resend = new Resend(resendKey);
  const fromEmail = process.env.RESEND_FROM_EMAIL || "proposals@proestimate.app";

  await resend.emails.send({
    from: `${companyName} <${fromEmail}>`,
    to: customer.email,
    subject: `Balance Due — ${estimate.estimateNumber} from ${companyName}`,
    html: `<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
  <div style="background: #0f172a; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 20px;">${companyName}</h1>
  </div>
  <div style="background: white; border: 1px solid #e2e8f0; border-top: none; padding: 32px; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px; margin: 0 0 16px;">Hi ${customer.name},</p>
    <p style="color: #475569; line-height: 1.6; margin: 0 0 24px;">
      Your project is complete! Thank you for choosing ${companyName}.
      The remaining balance of <strong>${formatter.format(balanceAmount)}</strong> is now due for project #${estimate.estimateNumber}.
    </p>
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; text-align: center; margin: 0 0 24px;">
      <p style="color: #16a34a; font-weight: 600; margin: 0 0 4px; font-size: 14px;">Balance Due</p>
      <p style="color: #15803d; font-size: 32px; font-weight: 700; margin: 0;">${formatter.format(balanceAmount)}</p>
    </div>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${url}" style="background: #16a34a; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
        Pay Balance Online
      </a>
    </div>
    <p style="color: #94a3b8; font-size: 13px; text-align: center; margin: 0;">
      Secure payment powered by Stripe. Questions? Reply to this email.
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
      action: "balance_request_sent",
      metadata: { to: customer.email, amount: balanceAmount },
    },
  });

  return NextResponse.json({ ok: true });
}
