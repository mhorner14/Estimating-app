import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateEstimateNumber } from "@/lib/utils";
import { z } from "zod";

const createEstimateSchema = z.object({
  customerId: z.string().optional().nullable(),
  newCustomer: z
    .object({
      name: z.string(),
      email: z.string().optional(),
      phone: z.string().optional(),
      projectAddress: z.string().optional(),
    })
    .optional()
    .nullable(),
  aiInput: z.string().optional(),
  aiResult: z.any().optional(),
  services: z.array(z.any()).optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as any).companyId;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const estimates = await prisma.estimate.findMany({
    where: {
      companyId,
      ...(status ? { status: status as any } : {}),
    },
    include: {
      project: { include: { customer: true } },
      lineItems: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(estimates);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as any).companyId;
  const userId = session.user.id!;

  try {
    const body = await req.json();
    const data = createEstimateSchema.parse(body);

    let customerId = data.customerId;

    // Create new customer if needed
    if (!customerId && data.newCustomer) {
      const customer = await prisma.customer.create({
        data: {
          companyId,
          name: data.newCustomer.name,
          email: data.newCustomer.email,
          phone: data.newCustomer.phone,
          projectAddress: data.newCustomer.projectAddress,
        },
      });
      customerId = customer.id;
    }

    if (!customerId) {
      return NextResponse.json({ error: "Customer required" }, { status: 400 });
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    // Create project
    const project = await prisma.project.create({
      data: {
        customerId,
        name: `${customer.name} — Estimate`,
        address: customer.projectAddress,
        projectType:
          data.aiResult?.parsedData?.projectType?.toUpperCase() === "COMMERCIAL"
            ? "COMMERCIAL"
            : "RESIDENTIAL",
      },
    });

    const parsedData = data.aiResult?.parsedData || {};
    const company = await prisma.company.findUnique({ where: { id: companyId } });

    // Build line items from AI parsed services + company services
    const lineItems: Array<{
      description: string;
      quantity: number;
      unit: string;
      unitPrice: number;
      totalPrice: number;
      cost?: number;
      serviceId?: string;
      isOptional?: boolean;
    }> = [];

    const serviceNames: string[] = Array.isArray(parsedData.services) ? parsedData.services : [];

    for (const serviceName of serviceNames) {
      const matchedService = (data.services || []).find(
        (s: any) =>
          s.name.toLowerCase().includes(serviceName.toLowerCase()) ||
          serviceName.toLowerCase().includes(s.name.toLowerCase())
      );

      if (matchedService) {
        const sqft = parsedData.squareFootage as number | undefined;
        const qty = matchedService.pricingType === "PER_SQFT" && sqft ? sqft : 1;
        const unit = matchedService.pricingType === "PER_SQFT" ? "sq ft" : matchedService.pricingType === "PER_LINEAR_FT" ? "linear ft" : "job";
        const totalPrice = Math.max(matchedService.basePrice * qty, matchedService.minCharge || 0);

        lineItems.push({
          serviceId: matchedService.id,
          description: matchedService.name,
          quantity: qty,
          unit,
          unitPrice: matchedService.basePrice,
          totalPrice,
          cost: matchedService.materialCost ? matchedService.materialCost * qty : undefined,
        });
      }
    }

    // Add crack repair if needed
    if (parsedData.crackRepairNeeded && parsedData.crackCount) {
      lineItems.push({
        description: `Crack Repair (${parsedData.crackCount} crack${Number(parsedData.crackCount) > 1 ? "s" : ""})`,
        quantity: Number(parsedData.crackCount),
        unit: "crack",
        unitPrice: 75,
        totalPrice: Number(parsedData.crackCount) * 75,
      });
    }

    // Stem walls
    if (parsedData.stemWalls && parsedData.linearFootage) {
      lineItems.push({
        description: "Stem Wall Coating",
        quantity: Number(parsedData.linearFootage),
        unit: "linear ft",
        unitPrice: 8,
        totalPrice: Number(parsedData.linearFootage) * 8,
      });
    }

    const subtotal = lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxRate = company?.taxEnabled ? (company.taxRate || 0) : 0;
    const taxAmount = (subtotal * taxRate) / 100;
    const totalAmount = subtotal + taxAmount;
    const depositPct = company?.depositPercentage || 50;
    const depositAmount = (totalAmount * depositPct) / 100;
    const totalCost = lineItems.reduce((sum, item) => sum + (item.cost || 0), 0);
    const margin = totalCost > 0 ? ((totalAmount - totalCost) / totalAmount) * 100 : 0;

    const estimate = await prisma.estimate.create({
      data: {
        companyId,
        projectId: project.id,
        createdById: userId,
        estimateNumber: generateEstimateNumber(),
        status: data.aiResult?.isComplete ? "READY_FOR_REVIEW" : "NEEDS_CLARIFICATION",
        squareFootage: parsedData.squareFootage as number | undefined,
        linearFootage: parsedData.linearFootage as number | undefined,
        existingCoating: Boolean(parsedData.existingCoating),
        crackRepairNeeded: Boolean(parsedData.crackRepairNeeded),
        surfaceCondition: parsedData.surfaceCondition as string | undefined,
        moistureConcerns: Boolean(parsedData.moistureConcerns),
        colorSelection: parsedData.colorSelection as string | undefined,
        requestedTimeline: parsedData.requestedTimeline as string | undefined,
        aiInputText: data.aiInput,
        aiParsedData: parsedData,
        aiSuggestions: {
          warnings: data.aiResult?.warnings || [],
          suggestions: data.aiResult?.suggestions || [],
          upsells: data.aiResult?.upsells || [],
        },
        subtotal,
        taxAmount,
        totalAmount,
        depositAmount,
        balanceDue: totalAmount - depositAmount,
        estimatedCost: totalCost,
        estimatedMargin: margin,
        lineItems: {
          create: lineItems.map((item, i) => ({ ...item, sortOrder: i })),
        },
      },
    });

    // Create proposal record
    await prisma.proposal.create({
      data: { estimateId: estimate.id },
    });

    return NextResponse.json(estimate);
  } catch (error) {
    console.error("Create estimate error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create estimate" }, { status: 500 });
  }
}
