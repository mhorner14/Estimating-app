import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as any).companyId;
  const body = await req.json();

  const customer = await prisma.customer.create({
    data: {
      companyId,
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      projectAddress: body.projectAddress || null,
      city: body.city || null,
      state: body.state || null,
      zip: body.zip || null,
      leadSource: body.leadSource || null,
      notes: body.notes || null,
    },
  });

  return NextResponse.json(customer);
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as any).companyId;
  const customers = await prisma.customer.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(customers);
}
