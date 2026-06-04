import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Expire proposals past their validUntil date
  const expired = await prisma.estimate.updateMany({
    where: {
      status: { in: ["SENT", "VIEWED"] },
      validUntil: { lt: now, not: null },
    },
    data: { status: "LOST" },
  });

  // Also update associated proposals
  const expiredEstimates = await prisma.estimate.findMany({
    where: {
      status: "LOST",
      validUntil: { lt: now, gt: new Date(now.getTime() - 24 * 60 * 60 * 1000) }, // expired in last 24h
    },
    select: { id: true },
  });

  if (expiredEstimates.length > 0) {
    await prisma.proposal.updateMany({
      where: {
        estimateId: { in: expiredEstimates.map((e) => e.id) },
        status: { in: ["SENT", "VIEWED"] },
      },
      data: { status: "EXPIRED" },
    });
  }

  return NextResponse.json({
    ok: true,
    expired: expired.count,
    timestamp: now.toISOString(),
  });
}
