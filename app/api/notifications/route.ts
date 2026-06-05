import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ count: 0, items: [] });

  const companyId = (session.user as any).companyId;
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [staleEstimates, needsClarification, scheduledToday, newLeads] = await Promise.all([
    prisma.estimate.count({
      where: {
        companyId,
        status: { in: ["SENT", "VIEWED"] },
        sentAt: { lt: threeDaysAgo, not: null },
      },
    }),
    prisma.estimate.count({
      where: { companyId, status: "NEEDS_CLARIFICATION" },
    }),
    prisma.estimate.count({
      where: {
        companyId,
        status: "SCHEDULED",
        scheduledDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
    }),
    // New intake form leads in last 24h
    prisma.activityLog.count({
      where: {
        action: "intake_submitted",
        createdAt: { gte: oneDayAgo },
        entityId: {
          in: (await prisma.estimate.findMany({ where: { companyId }, select: { id: true } })).map((e) => e.id),
        },
      },
    }),
  ]);

  const items = [];
  if (staleEstimates > 0) items.push({ type: "stale", message: `${staleEstimates} estimate${staleEstimates !== 1 ? "s" : ""} awaiting response`, href: "/estimates?status=SENT" });
  if (needsClarification > 0) items.push({ type: "clarification", message: `${needsClarification} estimate${needsClarification !== 1 ? "s" : ""} need clarification`, href: "/estimates?status=NEEDS_CLARIFICATION" });
  if (scheduledToday > 0) items.push({ type: "scheduled", message: `${scheduledToday} job${scheduledToday !== 1 ? "s" : ""} scheduled today`, href: "/schedule" });
  if (newLeads > 0) items.push({ type: "lead", message: `${newLeads} new lead${newLeads !== 1 ? "s" : ""} from intake form`, href: "/estimates?status=DRAFT" });

  return NextResponse.json({ count: items.length, items });
}
