import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const estimate = await prisma.estimate.findFirst({
    where: { id, companyId },
    include: {
      lineItems: { include: { service: true } },
      project: { include: { customer: true } },
    },
  });
  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const lineItemsText = estimate.lineItems.map((li) =>
    `- ${li.description} (qty: ${li.quantity}${li.unit ? ` ${li.unit}` : ""})`
  ).join("\n");

  const contextText = [
    estimate.squareFootage ? `Square footage: ${estimate.squareFootage} sqft` : null,
    estimate.linearFootage ? `Linear footage: ${estimate.linearFootage} lf` : null,
    estimate.colorSelection ? `Color: ${estimate.colorSelection}` : null,
    estimate.existingCoating ? "Has existing coating to remove" : null,
    estimate.crackRepairNeeded ? "Crack repair needed" : null,
    estimate.moistureConcerns ? "Moisture mitigation needed" : null,
  ].filter(Boolean).join("\n");

  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: `You are an expert concrete coatings contractor. Generate a material shopping list for this job.

Job Details:
${contextText}

Line Items:
${lineItemsText}

Return a JSON array of materials needed. Each item should have:
- name: string (product name, e.g. "100% Solids Epoxy Base Coat")
- quantity: number
- unit: string (gallons, bags, rolls, sheets, etc.)
- notes: string (coverage rate, mixing ratio, or important notes)
- category: string (one of: primer, base_coat, top_coat, flake, aggregate, prep, tools, consumables)

Calculate quantities based on the square footage and standard coverage rates:
- Epoxy primer: ~300 sqft/gallon
- Epoxy base coat: ~150 sqft/gallon (most systems need 2 coats)
- Polyaspartic/polyurea top coat: ~200 sqft/gallon
- Full broadcast flake: 1 lb/sqft
- Decorative flake (partial): 0.25 lb/sqft
- Concrete grinder pads: varies
- Add 10-15% waste factor

Return ONLY the JSON array, no other text.`,
    }],
  });

  const text = (msg.content[0] as any).text;
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return NextResponse.json({ error: "Failed to generate list" }, { status: 500 });

  const materials = JSON.parse(jsonMatch[0]);
  return NextResponse.json({ materials });
}
