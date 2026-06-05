import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; expId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = (session.user as any).companyId;
  const { id, expId } = await params;

  const estimate = await prisma.estimate.findFirst({ where: { id, companyId } });
  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.jobExpense.delete({ where: { id: expId } });

  // Recalculate
  const allExpenses = await prisma.jobExpense.findMany({ where: { estimateId: id } });
  const totalActual = allExpenses.reduce((sum, e) => sum + e.amount, 0);
  const materialTotal = allExpenses.filter((e) => e.category === "MATERIAL").reduce((sum, e) => sum + e.amount, 0);
  const laborTotal = allExpenses.filter((e) => ["LABOR", "SUBCONTRACTOR"].includes(e.category)).reduce((sum, e) => sum + e.amount, 0);

  await prisma.estimate.update({
    where: { id },
    data: {
      actualMaterialCost: materialTotal || null,
      actualLaborCost: laborTotal || null,
      actualTotalCost: totalActual || null,
    },
  });

  return NextResponse.json({ success: true });
}
