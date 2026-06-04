import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateEstimateNumber } from "@/lib/utils";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as any).companyId;

  const source = await prisma.estimate.findFirst({
    where: { id, companyId },
    include: { lineItems: true },
  });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const newEstimate = await prisma.estimate.create({
    data: {
      companyId,
      projectId: source.projectId,
      createdById: session.user.id!,
      estimateNumber: generateEstimateNumber(),
      status: "DRAFT",
      squareFootage: source.squareFootage,
      colorSelection: source.colorSelection,
      requestedTimeline: source.requestedTimeline,
      existingCoating: source.existingCoating,
      crackRepairNeeded: source.crackRepairNeeded,
      moistureConcerns: source.moistureConcerns,
      subtotal: source.subtotal,
      discountAmount: source.discountAmount,
      taxAmount: source.taxAmount,
      totalAmount: source.totalAmount,
      depositAmount: source.depositAmount,
      balanceDue: source.balanceDue,
      estimatedCost: source.estimatedCost,
      estimatedMargin: source.estimatedMargin,
      scopeOfWork: source.scopeOfWork,
      prepSteps: source.prepSteps,
      productsIncluded: source.productsIncluded,
      warrantyText: source.warrantyText,
      exclusions: source.exclusions,
      internalNotes: source.internalNotes,
      lineItems: {
        create: source.lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          isOptional: item.isOptional,
          serviceId: item.serviceId,
          sortOrder: item.sortOrder,
        })),
      },
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

  return NextResponse.json(newEstimate, { status: 201 });
}
