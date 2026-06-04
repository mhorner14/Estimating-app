import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPaymentLink } from "@/lib/stripe";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as any).companyId;
  const { type } = await req.json();

  const estimate = await prisma.estimate.findFirst({
    where: { id, companyId },
    include: { project: { include: { customer: true } } },
  });

  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let amount: number;
  let description: string;

  switch (type) {
    case "DEPOSIT":
      amount = estimate.depositAmount;
      description = `Deposit for ${estimate.estimateNumber}`;
      break;
    case "BALANCE":
      amount = estimate.balanceDue;
      description = `Balance for ${estimate.estimateNumber}`;
      break;
    case "FULL":
    default:
      amount = estimate.totalAmount;
      description = `Full payment for ${estimate.estimateNumber}`;
  }

  try {
    const { url, sessionId } = await createPaymentLink(
      amount,
      description,
      estimate.id,
      type,
      estimate.project.customer.email || undefined
    );

    const payment = await prisma.payment.create({
      data: {
        estimateId: estimate.id,
        stripeSessionId: sessionId,
        amount,
        type,
        status: "PENDING",
      },
    });

    return NextResponse.json({ url, payment, estimate });
  } catch (error) {
    console.error("Payment link error:", error);
    return NextResponse.json({ error: "Failed to create payment link" }, { status: 500 });
  }
}
