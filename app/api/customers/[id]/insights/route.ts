import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const companyId = (session?.user as any)?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const customer = await prisma.customer.findFirst({
    where: { id, companyId },
    include: {
      projects: {
        include: {
          estimates: {
            select: { status: true, totalAmount: true, createdAt: true, acceptedAt: true, satisfactionScore: true, squareFootage: true, lineItems: { select: { description: true } } },
          },
        },
      },
    },
  });
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 400 });
  }

  const WON = ["ACCEPTED", "DEPOSIT_PAID", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "BALANCE_DUE", "PAID_IN_FULL"];
  const estimates = customer.projects.flatMap((p) => p.estimates);
  const wonEstimates = estimates.filter((e) => WON.includes(e.status));
  const totalRevenue = wonEstimates.reduce((s, e) => s + Number(e.totalAmount), 0);
  const avgJobSize = wonEstimates.length > 0 ? totalRevenue / wonEstimates.length : 0;
  const services = [...new Set(estimates.flatMap((e) => e.lineItems.map((l: any) => l.description)))].slice(0, 10);

  const prompt = `Analyze this customer's history with a concrete coatings contractor and give brief, actionable insights.

Customer: ${customer.name}
Lead source: ${customer.leadSource || "Unknown"}
Total estimates: ${estimates.length}
Jobs won: ${wonEstimates.length}
Total revenue: $${totalRevenue.toFixed(0)}
Avg job size: $${avgJobSize.toFixed(0)}
Services purchased: ${services.join(", ") || "None yet"}
Satisfaction ratings: ${estimates.filter((e) => e.satisfactionScore).map((e) => e.satisfactionScore).join(", ") || "None"}

Return ONLY valid JSON:
{
  "summary": "1-2 sentence summary of this customer relationship",
  "insights": ["insight 1", "insight 2", "insight 3"],
  "nextAction": "Single best next action to take with this customer",
  "customerType": "VIP|Active|Prospect|At-Risk|Lost"
}`;

  const client = new Anthropic();
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    messages: [{ role: "user", content: prompt }],
  });

  const text = (message.content[0] as any).text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return NextResponse.json({ error: "Parse error" }, { status: 500 });

  return NextResponse.json(JSON.parse(jsonMatch[0]));
}
