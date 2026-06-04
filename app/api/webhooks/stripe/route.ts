import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 400 });
  }

  const stripe = (await import("stripe")).default;
  const client = new stripe(process.env.STRIPE_SECRET_KEY);

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  const rawBody = await req.arrayBuffer();
  const buf = Buffer.from(rawBody);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const { estimateId, paymentType } = session.metadata || {};

    if (!estimateId) return NextResponse.json({ ok: true });

    const estimate = await prisma.estimate.findUnique({ where: { id: estimateId } });
    if (!estimate) return NextResponse.json({ ok: true });

    // Update the Payment record to PAID
    await prisma.payment.updateMany({
      where: {
        estimateId,
        stripeSessionId: session.id,
      },
      data: { status: "PAID", paidAt: new Date() },
    });

    // Advance estimate status based on payment type
    const nextStatus =
      paymentType === "DEPOSIT" ? "DEPOSIT_PAID" :
      paymentType === "BALANCE" ? "PAID_IN_FULL" :
      paymentType === "FULL" ? "PAID_IN_FULL" : null;

    if (nextStatus) {
      await prisma.estimate.update({
        where: { id: estimateId },
        data: { status: nextStatus as any },
      });

      await prisma.activityLog.create({
        data: {
          entityType: "estimate",
          entityId: estimateId,
          action: "payment_recorded",
          metadata: {
            paymentType,
            amount: session.amount_total ? session.amount_total / 100 : 0,
            newStatus: nextStatus,
          },
        },
      });
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object as any;

    await prisma.payment.updateMany({
      where: { stripePaymentIntentId: intent.id },
      data: { status: "FAILED" },
    });
  }

  return NextResponse.json({ ok: true });
}
