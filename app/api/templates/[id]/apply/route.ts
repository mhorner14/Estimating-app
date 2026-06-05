import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = (session.user as any).companyId;
  const userId = (session.user as any).id;

  const template = await prisma.estimateTemplate.findFirst({ where: { id, companyId } });
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { customerId } = body;
  if (!customerId) return NextResponse.json({ error: "customerId required" }, { status: 400 });

  const customer = await prisma.customer.findFirst({ where: { id: customerId, companyId } });
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  // Create project
  const project = await prisma.project.create({
    data: {
      customerId,
      name: template.name,
      projectType: "RESIDENTIAL",
    },
  });

  const count = await prisma.estimate.count({ where: { companyId } });
  const estimateNumber = `EST-${String(count + 1).padStart(4, "0")}`;

  const lineItems = template.lineItems as Array<{
    serviceId?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    unit?: string;
  }>;

  // Calculate totals
  const subtotal = lineItems.reduce((s, item) => s + item.quantity * item.unitPrice, 0);
  const taxAmount = company.taxEnabled ? subtotal * (company.taxRate / 100) : 0;
  const total = subtotal + taxAmount;
  const depositAmount = total * (company.depositPercentage / 100);

  const estimate = await prisma.estimate.create({
    data: {
      companyId,
      projectId: project.id,
      createdById: userId,
      estimateNumber,
      status: "DRAFT",
      subtotal,
      taxAmount,
      totalAmount: total,
      depositAmount,
      balanceDue: total - depositAmount,
      internalNotes: template.notes || null,
    },
  });

  // Create line items
  for (const item of lineItems) {
    await prisma.estimateLineItem.create({
      data: {
        estimateId: estimate.id,
        serviceId: item.serviceId || null,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unit: item.unit || "sqft",
        totalPrice: item.quantity * item.unitPrice,
      },
    });
  }

  await prisma.activityLog.create({
    data: {
      userId,
      entityType: "estimate",
      entityId: estimate.id,
      action: "created_from_template",
      metadata: { templateName: template.name },
    },
  });

  return NextResponse.json({ estimateId: estimate.id, estimateNumber });
}
