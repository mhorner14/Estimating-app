import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as any).companyId;
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  const staleEstimates = await prisma.estimate.findMany({
    where: {
      companyId,
      status: { in: ["SENT", "VIEWED"] },
      sentAt: { lt: threeDaysAgo, not: null },
    },
    include: {
      project: { include: { customer: true } },
      company: true,
    },
  });

  if (staleEstimates.length === 0) {
    return NextResponse.json({ sent: 0, message: "No stale estimates to follow up on" });
  }

  let sent = 0;
  const errors: string[] = [];

  for (const estimate of staleEstimates) {
    const customerEmail = estimate.project.customer.email;
    if (!customerEmail) continue;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/estimates/${estimate.id}/follow-up`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: req.headers.get("cookie") || "",
        },
      });
      if (res.ok) sent++;
      else errors.push(estimate.estimateNumber);
    } catch {
      errors.push(estimate.estimateNumber);
    }
  }

  return NextResponse.json({
    sent,
    total: staleEstimates.length,
    errors: errors.length,
    message: `Sent ${sent} follow-up${sent !== 1 ? "s" : ""} out of ${staleEstimates.length} stale estimate${staleEstimates.length !== 1 ? "s" : ""}`,
  });
}
