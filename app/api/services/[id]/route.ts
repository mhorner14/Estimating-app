import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const service = await prisma.service.findFirst({ where: { id, companyId } });
  if (!service) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  const updated = await prisma.service.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.pricingType !== undefined && { pricingType: body.pricingType }),
      ...(body.basePrice !== undefined && { basePrice: body.basePrice }),
      ...(body.minCharge !== undefined && { minCharge: body.minCharge }),
      ...(body.materialCost !== undefined && { materialCost: body.materialCost }),
      ...(body.laborCost !== undefined && { laborCost: body.laborCost }),
      ...(body.marginTarget !== undefined && { marginTarget: body.marginTarget }),
      ...(body.defaultWarranty !== undefined && { defaultWarranty: body.defaultWarranty }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.showOnRateCard !== undefined && { showOnRateCard: body.showOnRateCard }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const service = await prisma.service.findFirst({ where: { id, companyId } });
  if (!service) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.service.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
