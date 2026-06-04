import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "90"; // days
  const days = parseInt(period);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [allEstimates, recentEstimates, customers] = await Promise.all([
    prisma.estimate.findMany({
      where: { companyId },
      select: { status: true, totalAmount: true, createdAt: true, estimatedMargin: true },
    }),
    prisma.estimate.findMany({
      where: { companyId, createdAt: { gte: since } },
      select: { status: true, totalAmount: true, createdAt: true, estimatedMargin: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.customer.findMany({
      where: { companyId },
      select: { leadSource: true, createdAt: true },
    }),
  ]);

  const WON = ["ACCEPTED", "DEPOSIT_PAID", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "BALANCE_DUE", "PAID_IN_FULL"];

  // Monthly revenue buckets for last 6 months
  const monthlyBuckets: Record<string, { created: number; won: number; wonRevenue: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyBuckets[key] = { created: 0, won: 0, wonRevenue: 0 };
  }

  for (const e of allEstimates) {
    const d = new Date(e.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (key in monthlyBuckets) {
      monthlyBuckets[key].created += 1;
      if (WON.includes(e.status)) {
        monthlyBuckets[key].won += 1;
        monthlyBuckets[key].wonRevenue += Number(e.totalAmount);
      }
    }
  }

  const monthly = Object.entries(monthlyBuckets).map(([month, data]) => ({
    month,
    label: new Date(month + "-01").toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    ...data,
    closeRate: data.created > 0 ? Math.round((data.won / data.created) * 100) : 0,
  }));

  // Lead source breakdown
  const leadSources: Record<string, number> = {};
  for (const c of customers) {
    const src = c.leadSource || "Unknown";
    leadSources[src] = (leadSources[src] || 0) + 1;
  }
  const leadSourceData = Object.entries(leadSources)
    .sort((a, b) => b[1] - a[1])
    .map(([source, count]) => ({ source, count, pct: Math.round((count / customers.length) * 100) }));

  // Status breakdown
  const statusCounts: Record<string, number> = {};
  const statusRevenue: Record<string, number> = {};
  for (const e of allEstimates) {
    statusCounts[e.status] = (statusCounts[e.status] || 0) + 1;
    statusRevenue[e.status] = (statusRevenue[e.status] || 0) + Number(e.totalAmount);
  }

  // Avg margin on won
  const wonItems = allEstimates.filter((e) => WON.includes(e.status) && e.estimatedMargin);
  const avgMargin = wonItems.length > 0
    ? Math.round(wonItems.reduce((s, e) => s + Number(e.estimatedMargin), 0) / wonItems.length)
    : 0;

  const totalWonRevenue = allEstimates.filter((e) => WON.includes(e.status)).reduce((s, e) => s + Number(e.totalAmount), 0);
  const totalPending = allEstimates.filter((e) => ["SENT", "VIEWED", "READY_FOR_REVIEW"].includes(e.status)).reduce((s, e) => s + Number(e.totalAmount), 0);
  const totalCount = allEstimates.length;
  const wonCount = allEstimates.filter((e) => WON.includes(e.status)).length;
  const lostCount = allEstimates.filter((e) => e.status === "LOST").length;
  const closeRate = (wonCount + lostCount) > 0 ? Math.round((wonCount / (wonCount + lostCount)) * 100) : 0;
  const avgJobSize = wonCount > 0 ? Math.round(totalWonRevenue / wonCount) : 0;

  return NextResponse.json({
    summary: { totalCount, wonCount, lostCount, closeRate, totalWonRevenue, totalPending, avgMargin, avgJobSize },
    monthly,
    leadSourceData,
    statusCounts,
    statusRevenue,
  });
}
