import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const WON = ["ACCEPTED", "DEPOSIT_PAID", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "BALANCE_DUE", "PAID_IN_FULL"];

  const estimates = await prisma.estimate.findMany({
    where: {
      companyId,
      status: { in: [...WON, "LOST"] as any[] },
    },
    include: {
      lineItems: { select: { description: true, totalPrice: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  if (estimates.length < 5) {
    return NextResponse.json({ error: "Not enough data yet (need at least 5 completed/lost estimates)" }, { status: 400 });
  }

  const wonJobs = estimates.filter((e) => WON.includes(e.status));
  const lostJobs = estimates.filter((e) => e.status === "LOST");

  const wonSummary = wonJobs.map((e) => ({
    amount: Number(e.totalAmount),
    sqft: e.squareFootage,
    margin: Number(e.estimatedMargin),
    services: e.lineItems.map((l) => l.description).slice(0, 3),
  }));

  const lostSummary = lostJobs.map((e) => ({
    amount: Number(e.totalAmount),
    sqft: e.squareFootage,
    reason: e.lostReason || "No reason given",
    services: e.lineItems.map((l) => l.description).slice(0, 3),
  }));

  const avgWonAmount = wonJobs.length > 0
    ? wonJobs.reduce((s, e) => s + Number(e.totalAmount), 0) / wonJobs.length
    : 0;
  const avgLostAmount = lostJobs.length > 0
    ? lostJobs.reduce((s, e) => s + Number(e.totalAmount), 0) / lostJobs.length
    : 0;
  const closeRate = Math.round((wonJobs.length / estimates.length) * 100);

  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    messages: [{
      role: "user",
      content: `You are a business coach for a concrete coatings contractor. Analyze this win/loss data and provide specific, actionable recommendations.

STATS:
- Close rate: ${closeRate}%
- Won: ${wonJobs.length} jobs, avg $${Math.round(avgWonAmount)}
- Lost: ${lostJobs.length} jobs, avg $${Math.round(avgLostAmount)}

WON JOBS (sample):
${JSON.stringify(wonSummary.slice(0, 10), null, 2)}

LOST JOBS (sample):
${JSON.stringify(lostSummary.slice(0, 15), null, 2)}

Return JSON with this structure:
{
  "headline": "One sentence summary of their business performance",
  "closeRateAssessment": "good|average|needs_improvement",
  "insights": [
    { "title": "string", "body": "string", "type": "positive|warning|tip" }
  ],
  "recommendations": [
    { "priority": "high|medium|low", "action": "string", "why": "string" }
  ],
  "pricingInsight": "string (comment on their pricing vs win rate)",
  "topLostReason": "string or null"
}

Provide 3-5 insights and 3-4 recommendations. Be specific and actionable, not generic.`,
    }],
  });

  const text = (msg.content[0] as any).text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return NextResponse.json({ error: "Analysis failed" }, { status: 500 });

  return NextResponse.json(JSON.parse(jsonMatch[0]));
}
