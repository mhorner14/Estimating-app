import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const staleEstimates = await prisma.estimate.findMany({
    where: {
      status: { in: ["SENT", "VIEWED"] },
      sentAt: { lte: threeDaysAgo, gte: sevenDaysAgo },
    },
    select: { id: true },
  });

  let sent = 0;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://proestimate.app";

  for (const estimate of staleEstimates) {
    const recentFollowUp = await prisma.activityLog.findFirst({
      where: { entityId: estimate.id, action: "follow_up_sent", createdAt: { gte: threeDaysAgo } },
    });
    if (recentFollowUp) continue;

    try {
      const res = await fetch(`${appUrl}/api/estimates/${estimate.id}/follow-up`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cron-secret": cronSecret || "",
        },
      });
      if (res.ok) sent++;
    } catch {
      // non-fatal
    }
  }

  return NextResponse.json({ sent, checked: staleEstimates.length });
}
