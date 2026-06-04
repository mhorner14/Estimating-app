import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { anthropic } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as any).companyId;
  const { estimateId, message, history = [] } = await req.json();

  if (!estimateId || !message) {
    return NextResponse.json({ error: "estimateId and message required" }, { status: 400 });
  }

  const estimate = await prisma.estimate.findFirst({
    where: { id: estimateId, companyId },
    include: {
      project: { include: { customer: true } },
      lineItems: true,
      company: true,
    },
  });

  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const systemPrompt = `You are an AI estimating assistant for ${estimate.company.name}, a concrete coatings contractor.
You have access to the current estimate and help the estimator with:
- Pricing questions and recommendations
- Warranty language suggestions
- Upsell opportunities
- Proposal language improvements
- Job-specific questions

Current Estimate Context:
- Customer: ${estimate.project.customer.name}
- Square footage: ${estimate.squareFootage || "not set"}
- Color: ${estimate.colorSelection || "not set"}
- Existing coating: ${estimate.existingCoating ? "Yes" : "No"}
- Crack repair: ${estimate.crackRepairNeeded ? "Yes" : "No"}
- Moisture concerns: ${estimate.moistureConcerns ? "Yes" : "No"}
- Services: ${estimate.lineItems.map((l) => l.description).join(", ")}
- Total: $${estimate.totalAmount.toFixed(2)}
- Margin: ${estimate.estimatedMargin.toFixed(1)}%

Be concise and practical. You are talking to the estimator, not the customer. Be direct and use contractor language.
If suggesting changes to the estimate, be specific about line items or pricing.`;

  const messages = [
    ...history.map((h: { role: string; content: string }) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    })),
    { role: "user" as const, content: message },
  ];

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: systemPrompt,
      messages,
    });

    const content = response.content[0];
    if (content.type !== "text") throw new Error("Unexpected response");

    return NextResponse.json({ reply: content.text });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: "AI chat failed" }, { status: 500 });
  }
}
