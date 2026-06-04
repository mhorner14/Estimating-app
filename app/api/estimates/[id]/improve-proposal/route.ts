import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { anthropic } from "@/lib/ai";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as any).companyId;

  const estimate = await prisma.estimate.findFirst({
    where: { id, companyId },
    include: {
      project: { include: { customer: true } },
      lineItems: true,
      company: true,
    },
  });

  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const prompt = `You are an expert contractor proposal writer specializing in concrete coatings.

Review the following proposal and return an improved version as JSON.

Customer: ${estimate.project.customer.name}
Company: ${estimate.company.name}
Services: ${estimate.lineItems.map((l) => l.description).join(", ")}
Square footage: ${estimate.squareFootage || "not specified"}
Color: ${estimate.colorSelection || "not specified"}
Has existing coating: ${estimate.existingCoating ? "yes" : "no"}
Crack repair needed: ${estimate.crackRepairNeeded ? "yes" : "no"}

Current proposal text:
- Title: ${estimate.proposalTitle || "(none)"}
- Scope: ${estimate.scopeOfWork || "(none)"}
- Prep steps: ${estimate.prepSteps || "(none)"}
- Products: ${estimate.productsIncluded || "(none)"}
- Warranty: ${estimate.warrantyText || "(none)"}
- Exclusions: ${estimate.exclusions || "(none)"}

Return a JSON object with these fields, all as strings:
{
  "proposalTitle": "...",
  "scopeOfWork": "...",
  "prepSteps": "...",
  "productsIncluded": "...",
  "warrantyText": "...",
  "exclusions": "...",
  "improvements": ["list of what was improved"]
}

Guidelines:
- Be professional and specific
- Scope of work should clearly describe what the customer gets
- Prep steps should be numbered and thorough
- Products should name specific coating systems
- Warranty should be clear and specific to the job
- Exclusions protect the contractor from scope creep
- Keep language customer-friendly but professional`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0];
    if (text.type !== "text") throw new Error("Unexpected response");

    const jsonMatch = text.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const result = JSON.parse(jsonMatch[0]);

    // Apply improvements to the estimate
    await prisma.estimate.update({
      where: { id },
      data: {
        proposalTitle: result.proposalTitle || estimate.proposalTitle,
        scopeOfWork: result.scopeOfWork || estimate.scopeOfWork,
        prepSteps: result.prepSteps || estimate.prepSteps,
        productsIncluded: result.productsIncluded || estimate.productsIncluded,
        warrantyText: result.warrantyText || estimate.warrantyText,
        exclusions: result.exclusions || estimate.exclusions,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Improve proposal error:", error);
    return NextResponse.json({ error: "AI improvement failed" }, { status: 500 });
  }
}
