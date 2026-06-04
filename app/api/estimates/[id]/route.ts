import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateEstimateTotals } from "@/lib/utils";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as any).companyId;
  const estimate = await prisma.estimate.findFirst({
    where: { id, companyId },
    include: {
      project: { include: { customer: true } },
      lineItems: { include: { service: true } },
      proposal: true,
      signature: true,
      payments: true,
    },
  });

  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(estimate);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as any).companyId;
  const body = await req.json();

  const estimate = await prisma.estimate.findFirst({ where: { id, companyId } });
  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let recalcData: Record<string, number> = {};
  if (body.discountAmount !== undefined) {
    const lineItems = await prisma.estimateLineItem.findMany({ where: { estimateId: id } });
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    const taxRate = company?.taxEnabled ? Number(company.taxRate || 0) : 0;
    const totals = calculateEstimateTotals(lineItems, 0, body.discountAmount, taxRate);
    const depositPct = Number(company?.depositPercentage || 50);
    const depositAmount = (totals.totalAmount * depositPct) / 100;
    recalcData = {
      subtotal: totals.subtotal,
      discountAmount: body.discountAmount,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      depositAmount,
      balanceDue: totals.totalAmount - depositAmount,
    };
  }

  const updated = await prisma.estimate.update({
    where: { id },
    data: {
      ...(body.status && { status: body.status }),
      ...(body.proposalTitle !== undefined && { proposalTitle: body.proposalTitle }),
      ...(body.scopeOfWork !== undefined && { scopeOfWork: body.scopeOfWork }),
      ...(body.prepSteps !== undefined && { prepSteps: body.prepSteps }),
      ...(body.productsIncluded !== undefined && { productsIncluded: body.productsIncluded }),
      ...(body.warrantyText !== undefined && { warrantyText: body.warrantyText }),
      ...(body.exclusions !== undefined && { exclusions: body.exclusions }),
      ...(body.colorSelection !== undefined && { colorSelection: body.colorSelection }),
      ...(body.internalNotes !== undefined && { internalNotes: body.internalNotes }),
      ...(body.requestedTimeline !== undefined && { requestedTimeline: body.requestedTimeline }),
      ...(body.squareFootage !== undefined && { squareFootage: body.squareFootage }),
      ...recalcData,
    },
  });

  if (body.status && body.status !== estimate.status) {
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        entityType: "estimate",
        entityId: id,
        action: "status_changed",
        metadata: { from: estimate.status, to: body.status },
      },
    });
  }

  return NextResponse.json(updated);
}
