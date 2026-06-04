import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as any).companyId;
  const estimate = await prisma.estimate.findFirst({ where: { id, companyId } });
  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { amount, type, note } = body;

  if (!amount || !type) return NextResponse.json({ error: "amount and type required" }, { status: 400 });

  const payment = await prisma.payment.create({
    data: {
      estimateId: id,
      amount: parseFloat(amount),
      type,
      status: "PAID",
      paidAt: new Date(),
      receiptUrl: note || null,
    },
  });

  // Auto-advance status
  let newStatus = estimate.status;
  if (type === "DEPOSIT" && estimate.status === "ACCEPTED") newStatus = "DEPOSIT_PAID";
  if (type === "BALANCE" && estimate.status === "DEPOSIT_PAID") newStatus = "BALANCE_DUE";
  if (type === "FULL") newStatus = "PAID_IN_FULL";

  const updatedEstimate = await prisma.estimate.update({
    where: { id },
    data: { status: newStatus },
    include: {
      project: { include: { customer: true } },
      lineItems: { include: { service: true } },
      proposal: true,
      signature: true,
      payments: true,
      company: true,
      notes: { include: { user: true } },
      photos: true,
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: session.user.id,
      entityType: "estimate",
      entityId: id,
      action: "payment_recorded",
      metadata: { amount, type },
    },
  });

  return NextResponse.json({ payment, estimate: updatedEstimate }, { status: 201 });
}
