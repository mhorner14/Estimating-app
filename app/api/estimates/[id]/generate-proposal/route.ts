import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateProposalContent } from "@/lib/ai";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as any).companyId;

  const estimate = await prisma.estimate.findFirst({
    where: { id, companyId },
    include: {
      project: { include: { customer: true } },
      lineItems: { include: { service: true } },
      company: true,
    },
  });

  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const proposalContent = await generateProposalContent({
      customerName: estimate.project.customer.name,
      projectAddress:
        estimate.project.customer.projectAddress ||
        estimate.project.address ||
        "",
      services: estimate.lineItems.map((item) => ({
        name: item.description,
        description: item.service?.description || "",
        quantity: item.quantity,
        unit: item.unit || "",
        price: item.totalPrice,
      })),
      squareFootage: estimate.squareFootage ?? undefined,
      colorSelection: estimate.colorSelection ?? undefined,
      existingCoating: estimate.existingCoating,
      crackRepairNeeded: estimate.crackRepairNeeded,
      moistureConcerns: estimate.moistureConcerns,
      totalAmount: estimate.totalAmount,
      companyName: estimate.company.name,
    });

    const updated = await prisma.estimate.update({
      where: { id },
      data: {
        proposalTitle: proposalContent.proposalTitle,
        scopeOfWork: proposalContent.scopeOfWork,
        prepSteps: proposalContent.prepSteps,
        productsIncluded: proposalContent.productsIncluded,
        warrantyText: proposalContent.warrantyText,
        exclusions: proposalContent.exclusions,
        status: "READY_FOR_REVIEW",
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
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
  } catch (error) {
    console.error("Generate proposal error:", error);
    return NextResponse.json({ error: "Failed to generate proposal" }, { status: 500 });
  }
}
