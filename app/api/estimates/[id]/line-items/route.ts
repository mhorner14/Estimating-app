import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateEstimateTotals } from "@/lib/utils";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as any).companyId;
  const estimate = await prisma.estimate.findFirst({ where: { id, companyId } });
  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { description, quantity, unit, unitPrice, serviceId, isOptional } = body;
  const totalPrice = parseFloat(quantity) * parseFloat(unitPrice);

  const count = await prisma.estimateLineItem.count({ where: { estimateId: id } });

  await prisma.estimateLineItem.create({
    data: {
      estimateId: id,
      serviceId: serviceId || null,
      description,
      quantity: parseFloat(quantity),
      unit: unit || "job",
      unitPrice: parseFloat(unitPrice),
      totalPrice,
      isOptional: Boolean(isOptional),
      sortOrder: count,
    },
  });

  // Recalculate totals
  const allItems = await prisma.estimateLineItem.findMany({ where: { estimateId: id } });
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  const totals = calculateEstimateTotals(
    allItems,
    0,
    0,
    company?.taxEnabled ? company.taxRate || 0 : 0
  );
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
      lineItems: { include: { service: true }, orderBy: { sortOrder: "asc" } },
      proposal: true,
      signature: true,
      payments: true,
      company: true,
      notes: { include: { user: true }, orderBy: { createdAt: "desc" } },
      photos: { orderBy: { sortOrder: "asc" } },
    },
  });

  return NextResponse.json(updated);
}
