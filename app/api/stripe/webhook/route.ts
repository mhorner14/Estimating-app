import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { estimateId, paymentType } = session.metadata || {};

    if (estimateId && paymentType) {
      await prisma.payment.updateMany({
        where: {
          estimateId,
          stripeSessionId: session.id,
        },
        data: {
          status: "PAID",
          paidAt: new Date(),
          receiptUrl: (session as unknown as Record<string, unknown>).receipt_url as string | undefined,
        },
      });

      const newStatus = paymentType === "DEPOSIT" ? "DEPOSIT_PAID" : "PAID_IN_FULL";
      await prisma.estimate.update({
        where: { id: estimateId },
        data: { status: newStatus },
      });
    }
  }

  return NextResponse.json({ received: true });
}
