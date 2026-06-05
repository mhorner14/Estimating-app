import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { companyId, name, email, phone, address, city, state, zip, projectDescription, surfaceType, squareFootage, timeline, budget } = body;

  if (!companyId || !name) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Create or find customer
  let customer = email
    ? await prisma.customer.findFirst({ where: { companyId, email } })
    : null;

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        companyId,
        name,
        email: email || null,
        phone: phone || null,
        projectAddress: address || null,
        city: city || null,
        state: state || null,
        zip: zip || null,
        leadSource: "Intake Form",
      },
    });
  }

  // AI parse the intake description
  let aiParsedData: any = null;
  const intakeText = [
    projectDescription,
    surfaceType && `Surface type: ${surfaceType}`,
    squareFootage && `Square footage: ${squareFootage} sqft`,
    timeline && `Timeline: ${timeline}`,
    budget && `Budget: ${budget}`,
  ].filter(Boolean).join("\n");

  try {
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      messages: [{
        role: "user",
        content: `Parse this concrete coating project intake for an estimating app. Extract key details as JSON.

Intake: ${intakeText}

Return JSON with these fields (use null if unknown):
{
  "projectType": "RESIDENTIAL or COMMERCIAL",
  "surfaceType": "string (garage, patio, basement, driveway, etc.)",
  "squareFootage": number or null,
  "existingCoating": true/false,
  "crackRepairNeeded": true/false,
  "colorPreference": "string or null",
  "timeline": "ASAP, 1-2 weeks, 1 month, flexible",
  "urgency": "HIGH, MEDIUM, LOW",
  "estimatedBudget": number or null,
  "notes": "any other relevant details"
}`,
      }],
    });
    const text = (msg.content[0] as any).text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) aiParsedData = JSON.parse(jsonMatch[0]);
  } catch {
    // AI parsing failure is non-fatal
  }

  // Create project
  const project = await prisma.project.create({
    data: {
      customerId: customer.id,
      name: `${name} – ${surfaceType || "Concrete Coating"}`,
      projectType: aiParsedData?.projectType === "COMMERCIAL" ? "COMMERCIAL" : "RESIDENTIAL",
      address: address || null,
      city: city || null,
      state: state || null,
      zip: zip || null,
    },
  });

  // Create draft estimate
  const count = await prisma.estimate.count({ where: { companyId } });
  const estimateNumber = `EST-${String(count + 1).padStart(4, "0")}`;

  const estimate = await prisma.estimate.create({
    data: {
      companyId,
      projectId: project.id,
      createdById: (await prisma.user.findFirst({ where: { companyId } }))!.id,
      estimateNumber,
      status: "DRAFT",
      aiInputText: intakeText,
      aiParsedData,
      squareFootage: aiParsedData?.squareFootage || (squareFootage ? parseFloat(squareFootage) : null),
      colorSelection: aiParsedData?.colorPreference || null,
      requestedTimeline: aiParsedData?.timeline || timeline || null,
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: (await prisma.user.findFirst({ where: { companyId } }))!.id,
      entityType: "estimate",
      entityId: estimate.id,
      action: "intake_submitted",
      metadata: { source: "Customer Intake Form", customerName: name },
    },
  });

  return NextResponse.json({ ok: true, estimateId: estimate.id, estimateNumber });
}
