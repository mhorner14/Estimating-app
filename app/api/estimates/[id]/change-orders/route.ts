import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = (session.user as any).companyId;
  const { id } = await params;

  const estimate = await prisma.estimate.findFirst({ where: { id, companyId } });
  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const changeOrders = await prisma.changeOrder.findMany({
    where: { estimateId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(changeOrders);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = (session.user as any).companyId;
  const { id } = await params;

  const estimate = await prisma.estimate.findFirst({
    where: { id, companyId },
    include: { changeOrders: { select: { id: true } } },
  });
  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { description, lineItems, amount } = await req.json();
  if (!description) return NextResponse.json({ error: "Description required" }, { status: 400 });

  const coNumber = `${estimate.estimateNumber}-CO${estimate.changeOrders.length + 1}`;

  const changeOrder = await prisma.changeOrder.create({
    data: {
      estimateId: id,
      number: coNumber,
      description,
      lineItems: lineItems || [],
      amount: amount || 0,
    },
  });

  return NextResponse.json(changeOrder);
}
