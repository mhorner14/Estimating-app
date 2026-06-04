import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { paymentType } = await req.json(); // "DEPOSIT" | "BALANCE" | "FULL"

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

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Payments not configured" }, { status: 400 });
  }

  const amount =
    paymentType === "DEPOSIT"
      ? Number(estimate.depositAmount)
      : paymentType === "BALANCE"
      ? Number(estimate.balanceDue)
      : Number(estimate.totalAmount);

  if (amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const amountCents = Math.round(amount * 100);
  const customer = estimate.project.customer;
  const companyName = estimate.company?.name || "Contractor";

  const label =
    paymentType === "DEPOSIT"
      ? `Deposit — ${estimate.estimateNumber}`
      : paymentType === "BALANCE"
      ? `Balance Due — ${estimate.estimateNumber}`
      : `Full Payment — ${estimate.estimateNumber}`;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://proestimate.app";
  const proposalUrl = `${appUrl}/proposal/${proposal.publicToken}`;

  // Create a pending payment record
  const payment = await prisma.payment.create({
    data: {
      estimateId: estimate.id,
      amount: amount,
      type: paymentType === "DEPOSIT" ? "DEPOSIT" : paymentType === "FULL" ? "FULL" : "BALANCE",
      status: "PENDING",
    },
  });

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: label,
            description: `${companyName} — Project #${estimate.estimateNumber}`,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    customer_email: customer.email || undefined,
    success_url: `${proposalUrl}?payment=success`,
    cancel_url: `${proposalUrl}?payment=cancelled`,
    metadata: {
      estimateId: estimate.id,
      paymentId: payment.id,
      paymentType,
    },
  });

  // Store session ID on payment
  await prisma.payment.update({
    where: { id: payment.id },
    data: { stripeSessionId: session.id },
  });

  return NextResponse.json({ url: session.url });
}
