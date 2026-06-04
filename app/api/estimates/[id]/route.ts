import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
      ...(body.discountAmount !== undefined && { discountAmount: body.discountAmount }),
      ...(body.internalNotes !== undefined && { internalNotes: body.internalNotes }),
    },
  });

  return NextResponse.json(updated);
}
