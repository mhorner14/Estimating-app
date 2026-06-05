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
      select: { status: true, totalAmount: true, createdAt: true, estimatedMargin: true, lostReason: true, satisfactionScore: true },
    }),
    prisma.estimate.findMany({
      where: { companyId, createdAt: { gte: since } },
      select: { status: true, totalAmount: true, createdAt: true, estimatedMargin: true, lostReason: true, satisfactionScore: true },
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

  // Satisfaction score
  const ratedJobs = allEstimates.filter((e) => e.satisfactionScore !== null && e.satisfactionScore !== undefined);
  const avgSatisfaction = ratedJobs.length > 0
    ? Math.round((ratedJobs.reduce((s, e) => s + Number(e.satisfactionScore), 0) / ratedJobs.length) * 10) / 10
    : null;

  // Lost reason breakdown
  const lostReasons: Record<string, number> = {};
  for (const e of allEstimates) {
    if (e.status === "LOST") {
      const reason = e.lostReason || "No reason recorded";
      lostReasons[reason] = (lostReasons[reason] || 0) + 1;
    }
  }
  const lostReasonData = Object.entries(lostReasons)
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => ({ reason, count, pct: lostCount > 0 ? Math.round((count / lostCount) * 100) : 0 }));

  // Forecast: scheduled/in-progress jobs with expected completion
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const in60 = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const in90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const scheduledJobs = await prisma.estimate.findMany({
    where: {
      companyId,
      status: { in: ["ACCEPTED", "DEPOSIT_PAID", "SCHEDULED", "IN_PROGRESS", "BALANCE_DUE"] },
    },
    select: { totalAmount: true, depositAmount: true, balanceDue: true, scheduledDate: true, status: true },
  });

  function forecastRevenue(jobs: typeof scheduledJobs, before: Date) {
    return jobs.reduce((sum, job) => {
      const scheduled = job.scheduledDate ? new Date(job.scheduledDate) : null;
      if (scheduled && scheduled <= before) {
        return sum + Number(job.totalAmount);
      }
      // No scheduled date — count ACCEPTED/DEPOSIT_PAID as likely within 30 days
      if (!scheduled && ["ACCEPTED", "DEPOSIT_PAID"].includes(job.status)) {
        return sum + Number(job.totalAmount);
      }
      return sum;
    }, 0);
  }

  const forecast = {
    next30: forecastRevenue(scheduledJobs, in30),
    next60: forecastRevenue(scheduledJobs, in60),
    next90: forecastRevenue(scheduledJobs, in90),
    jobCount: scheduledJobs.length,
    depositSecured: scheduledJobs.reduce((s, j) => s + Number(j.depositAmount), 0),
    balanceOutstanding: scheduledJobs.reduce((s, j) => s + Number(j.balanceDue), 0),
  };

  // Job profitability breakdown
  const completedJobs = await prisma.estimate.findMany({
    where: {
      companyId,
      status: { in: ["COMPLETED", "PAID_IN_FULL", "BALANCE_DUE"] },
      actualTotalCost: { not: null },
    },
    include: { project: { include: { customer: { select: { name: true } } } } },
    orderBy: { updatedAt: "desc" },
    take: 30,
  });

  const profitabilityData = completedJobs.map((e) => {
    const revenue = Number(e.totalAmount);
    const cost = Number(e.actualTotalCost);
    const actualMargin = cost > 0 ? ((revenue - cost) / revenue) * 100 : null;
    const estimatedMargin = Number(e.estimatedMargin);
    return {
      id: e.id,
      estimateNumber: e.estimateNumber,
      customerName: e.project.customer.name,
      revenue,
      cost,
      actualMargin,
      estimatedMargin,
      marginDiff: actualMargin !== null ? actualMargin - estimatedMargin : null,
    };
  });

  return NextResponse.json({
    summary: { totalCount, wonCount, lostCount, closeRate, totalWonRevenue, totalPending, avgMargin, avgJobSize, avgSatisfaction, ratedJobCount: ratedJobs.length },
    monthly,
    leadSourceData,
    statusCounts,
    statusRevenue,
    lostReasonData,
    forecast,
    profitabilityData,
  });
}
