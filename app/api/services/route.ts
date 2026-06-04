import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const body = await req.json();

  const count = await prisma.service.count({ where: { companyId } });

  const service = await prisma.service.create({
    data: {
      companyId,
      name: body.name,
      description: body.description,
      category: body.category,
      pricingType: body.pricingType,
      basePrice: body.basePrice,
      minCharge: body.minCharge || 0,
      materialCost: body.materialCost,
      laborCost: body.laborCost,
      marginTarget: body.marginTarget || 40,
      defaultWarranty: body.defaultWarranty,
      sortOrder: count,
    },
  });

  return NextResponse.json(service);
}
