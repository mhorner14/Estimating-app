import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as any).companyId;
  const userId = (session.user as any).id;
  const { customerId, serviceId, quantity } = await req.json();

  const [customer, service] = await Promise.all([
    prisma.customer.findFirst({ where: { id: customerId, companyId } }),
    prisma.service.findFirst({ where: { id: serviceId, companyId } }),
  ]);

  if (!customer || !service) {
    return NextResponse.json({ error: "Customer or service not found" }, { status: 404 });
  }

  const totalPrice = Math.max(service.basePrice * quantity, service.minCharge);
  const cost = service.laborCost && service.materialCost
    ? (service.laborCost + service.materialCost) * quantity
    : null;

  const company = await prisma.company.findUnique({ where: { id: companyId } });

  const count = await prisma.estimate.count({ where: { companyId } });
  const estimateNumber = `EST-${String(count + 1).padStart(4, "0")}`;

  const taxRate = company?.taxEnabled ? (company?.taxRate ?? 0) / 100 : 0;
  const depositPct = (company?.depositPercentage ?? 50) / 100;
  const taxAmount = totalPrice * taxRate;
  const totalAmount = totalPrice + taxAmount;
  const depositAmount = totalAmount * depositPct;

  const project = await prisma.project.create({
    data: {
      customerId: customer.id,
      name: `${service.name} — ${customer.name}`,
    },
  });

  const estimate = await prisma.estimate.create({
    data: {
      companyId,
      projectId: project.id,
      createdById: userId,
      estimateNumber,
      status: "DRAFT",
      squareFootage: service.pricingType === "PER_SQFT" ? quantity : null,
      linearFootage: service.pricingType === "PER_LINEAR_FT" ? quantity : null,
      subtotal: totalPrice,
      taxAmount,
      totalAmount,
      depositAmount,
      balanceDue: totalAmount - depositAmount,
      estimatedCost: cost ?? 0,
      estimatedMargin: cost ? ((totalPrice - cost) / totalPrice) * 100 : service.marginTarget ?? 0,
    },
  });

  const unit =
    service.pricingType === "PER_SQFT" ? "sq ft" :
    service.pricingType === "PER_LINEAR_FT" ? "lin ft" :
    service.pricingType === "HOURLY" ? "hr" : "each";

  await prisma.estimateLineItem.create({
    data: {
      estimateId: estimate.id,
      serviceId: service.id,
      description: service.name,
      quantity,
      unit,
      unitPrice: service.basePrice,
      totalPrice,
      cost: cost ?? null,
      sortOrder: 0,
    },
  });

  await prisma.activityLog.create({
    data: {
      userId,
      entityType: "estimate",
      entityId: estimate.id,
      action: "created",
      metadata: { method: "quick", serviceId, quantity },
    },
  });

  return NextResponse.json({ id: estimate.id });
}
