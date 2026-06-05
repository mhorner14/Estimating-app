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

  const expenses = await prisma.jobExpense.findMany({
    where: { estimateId: id },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(expenses);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = (session.user as any).companyId;
  const { id } = await params;

  const estimate = await prisma.estimate.findFirst({ where: { id, companyId } });
  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { description, category, amount, vendor, date } = await req.json();
  if (!description || !amount) return NextResponse.json({ error: "Description and amount required" }, { status: 400 });

  const expense = await prisma.jobExpense.create({
    data: {
      estimateId: id,
      description,
      category: category || "MATERIAL",
      amount: parseFloat(amount),
      vendor,
      date: date ? new Date(date) : new Date(),
    },
  });

  // Update actual costs on estimate
  const allExpenses = await prisma.jobExpense.findMany({ where: { estimateId: id } });
  const totalActual = allExpenses.reduce((sum, e) => sum + e.amount, 0);
  const materialTotal = allExpenses.filter((e) => e.category === "MATERIAL").reduce((sum, e) => sum + e.amount, 0);
  const laborTotal = allExpenses.filter((e) => ["LABOR", "SUBCONTRACTOR"].includes(e.category)).reduce((sum, e) => sum + e.amount, 0);

  await prisma.estimate.update({
    where: { id },
    data: {
      actualMaterialCost: materialTotal || null,
      actualLaborCost: laborTotal || null,
      actualTotalCost: totalActual,
    },
  });

  return NextResponse.json(expense);
}
