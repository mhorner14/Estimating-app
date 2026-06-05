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
    select: {
      totalAmount: true,
      squareFootage: true,
      estimatedMargin: true,
      estimatedCost: true,
      status: true,
    },
  });

  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const WON = ["ACCEPTED", "DEPOSIT_PAID", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "BALANCE_DUE", "PAID_IN_FULL"];

  // Find comparable jobs (same company, similar size ±50%)
  const sqft = estimate.squareFootage;
  const comparables = await prisma.estimate.findMany({
    where: {
      companyId,
      id: { not: id },
      status: { in: [...WON, "LOST"] as any[] },
      ...(sqft
        ? { squareFootage: { gte: sqft * 0.5, lte: sqft * 1.5, not: null } }
        : {}),
    },
    select: {
      totalAmount: true,
      squareFootage: true,
      estimatedMargin: true,
      status: true,
      lostReason: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const wonJobs = comparables.filter((e) => WON.includes(e.status));
  const lostJobs = comparables.filter((e) => e.status === "LOST");

  const avgWonTotal = wonJobs.length > 0
    ? wonJobs.reduce((s, e) => s + Number(e.totalAmount), 0) / wonJobs.length
    : null;

  const avgWonMargin = wonJobs.filter((e) => e.estimatedMargin).length > 0
    ? wonJobs.filter((e) => e.estimatedMargin).reduce((s, e) => s + Number(e.estimatedMargin), 0) / wonJobs.filter((e) => e.estimatedMargin).length
    : null;

  const avgWonPricePerSqft = wonJobs.filter((e) => e.squareFootage && e.squareFootage > 0).length > 0
    ? wonJobs.filter((e) => e.squareFootage && e.squareFootage > 0).reduce((s, e) => s + Number(e.totalAmount) / Number(e.squareFootage), 0) /
      wonJobs.filter((e) => e.squareFootage && e.squareFootage > 0).length
    : null;

  const currentPricePerSqft = sqft && sqft > 0 ? Number(estimate.totalAmount) / sqft : null;

  // Price comparison vs avg won
  let pricePosition: "competitive" | "high" | "low" | "unknown" = "unknown";
  let priceDiffPct: number | null = null;
  if (avgWonTotal && Number(estimate.totalAmount) > 0) {
    priceDiffPct = Math.round(((Number(estimate.totalAmount) - avgWonTotal) / avgWonTotal) * 100);
    if (priceDiffPct > 15) pricePosition = "high";
    else if (priceDiffPct < -15) pricePosition = "low";
    else pricePosition = "competitive";
  }

  // Top lost reasons for context
  const lostReasonCounts: Record<string, number> = {};
  for (const j of lostJobs) {
    const r = j.lostReason || "Unknown";
    lostReasonCounts[r] = (lostReasonCounts[r] || 0) + 1;
  }
  const topLostReason = Object.entries(lostReasonCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // Suggested price range (±10% of avg won)
  const suggestedMin = avgWonTotal ? Math.round(avgWonTotal * 0.9) : null;
  const suggestedMax = avgWonTotal ? Math.round(avgWonTotal * 1.1) : null;

  return NextResponse.json({
    comparable: {
      wonCount: wonJobs.length,
      lostCount: lostJobs.length,
      avgWonTotal,
      avgWonMargin,
      avgWonPricePerSqft,
    },
    current: {
      total: Number(estimate.totalAmount),
      margin: Number(estimate.estimatedMargin),
      pricePerSqft: currentPricePerSqft,
    },
    analysis: {
      pricePosition,
      priceDiffPct,
      suggestedMin,
      suggestedMax,
      topLostReason,
    },
  });
}
