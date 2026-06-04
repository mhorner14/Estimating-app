import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateEstimateTotals } from "@/lib/utils";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; lineItemId: string }> }
) {
  const { id, lineItemId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as any).companyId;
  const body = await req.json();

  const estimate = await prisma.estimate.findFirst({ where: { id, companyId } });
  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.estimateLineItem.update({
    where: { id: lineItemId },
    data: {
      ...(body.description !== undefined && { description: body.description }),
      ...(body.quantity !== undefined && { quantity: body.quantity }),
      ...(body.unitPrice !== undefined && { unitPrice: body.unitPrice }),
      ...(body.totalPrice !== undefined && { totalPrice: body.totalPrice }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
    },
  });

  // If only reordering, return a lightweight response
  if (body.sortOrder !== undefined && body.description === undefined) {
    return NextResponse.json({ ok: true });
  }

  const allItems = await prisma.estimateLineItem.findMany({ where: { estimateId: id } });
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  const totals = calculateEstimateTotals(allItems, 0, 0, company?.taxEnabled ? (company.taxRate || 0) : 0);
  const depositPct = company?.depositPercentage || 50;
  const depositAmount = (totals.totalAmount * depositPct) / 100;

  const updated = await prisma.estimate.update({
    where: { id },
    data: {
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      depositAmount,
      balanceDue: totals.totalAmount - depositAmount,
      estimatedCost: totals.totalCost,
      estimatedMargin: totals.margin,
    },
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

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; lineItemId: string }> }
) {
  const { id, lineItemId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as any).companyId;
  const estimate = await prisma.estimate.findFirst({ where: { id, companyId } });
  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.estimateLineItem.delete({ where: { id: lineItemId } });

  return NextResponse.json({ success: true });
}
