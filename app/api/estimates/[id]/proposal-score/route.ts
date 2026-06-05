import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const companyId = (session?.user as any)?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const estimate = await prisma.estimate.findFirst({
    where: { id, companyId },
    include: {
      project: { include: { customer: true } },
      lineItems: { include: { service: true } },
      photos: true,
      proposal: true,
    },
  });
  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 400 });
  }

  const lineItemSummary = estimate.lineItems.map((li: any) =>
    `- ${li.description}: $${Number(li.totalPrice).toFixed(2)}`
  ).join("\n");

  const prompt = `You are a sales coach for a concrete coatings contractor. Score this proposal draft and give actionable improvements.

PROPOSAL DATA:
Customer: ${estimate.project.customer.name}
Email on file: ${estimate.project.customer.email ? "Yes" : "No"}
Address: ${estimate.project.address || estimate.project.customer.projectAddress || "Not provided"}
Square footage: ${estimate.squareFootage ? `${estimate.squareFootage} sqft` : "Not specified"}
Total: $${Number(estimate.totalAmount).toFixed(2)}
Deposit: $${Number(estimate.depositAmount).toFixed(2)}
Valid until: ${estimate.validUntil ? new Date(estimate.validUntil).toLocaleDateString() : "Not set"}

Line Items:
${lineItemSummary || "None"}

Scope of Work: ${estimate.scopeOfWork ? `${estimate.scopeOfWork.slice(0, 300)}...` : "MISSING"}
Prep Steps: ${estimate.prepSteps ? "Present" : "MISSING"}
Products Included: ${estimate.productsIncluded ? "Present" : "MISSING"}
Warranty: ${estimate.warrantyText ? "Present" : "MISSING"}
Exclusions: ${estimate.exclusions ? "Present" : "MISSING"}
Photos attached: ${estimate.photos.length}
Proposal title: ${estimate.proposalTitle || "Not set"}

Score each category 1-10 and return ONLY valid JSON in this exact shape:
{
  "overallScore": 7,
  "readyToSend": true,
  "categories": [
    { "name": "Scope & Detail", "score": 8, "status": "good", "tip": "..." },
    { "name": "Pricing Clarity", "score": 7, "status": "good", "tip": "..." },
    { "name": "Trust Signals", "score": 5, "status": "warning", "tip": "..." },
    { "name": "Contact & Validity", "score": 9, "status": "good", "tip": "..." },
    { "name": "Visual Proof", "score": 3, "status": "issue", "tip": "..." }
  ],
  "topAction": "One most important thing to do before sending",
  "strengths": ["strength 1", "strength 2"]
}

status must be "good" (8-10), "warning" (5-7), or "issue" (1-4). readyToSend is true if overallScore >= 6.`;

  const client = new Anthropic();
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 800,
    messages: [{ role: "user", content: prompt }],
  });

  const text = (message.content[0] as any).text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return NextResponse.json({ error: "AI parse error" }, { status: 500 });

  const score = JSON.parse(jsonMatch[0]);
  return NextResponse.json(score);
}
