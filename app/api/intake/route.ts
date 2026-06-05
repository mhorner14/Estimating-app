import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";

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

  // Send emails if Resend is configured
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@proestimate.app";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://proestimate.app";

    // Confirmation to customer
    if (email) {
      resend.emails.send({
        from: `${company.name} <${fromEmail}>`,
        to: email,
        subject: `We received your request — ${company.name}`,
        html: `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1e293b;">
  <div style="background:#0f172a;padding:24px;border-radius:12px 12px 0 0;">
    <h1 style="color:white;margin:0;font-size:18px;">${company.name}</h1>
  </div>
  <div style="background:white;border:1px solid #e2e8f0;border-top:none;padding:28px;border-radius:0 0 12px 12px;">
    <p style="font-size:16px;margin:0 0 12px;">Hi ${name},</p>
    <p style="color:#475569;line-height:1.7;margin:0 0 16px;">
      Thanks for reaching out! We received your project request and will be in touch soon with a detailed estimate.
    </p>
    ${projectDescription ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:16px;">
      <p style="font-size:12px;color:#94a3b8;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.05em;">Your Request</p>
      <p style="color:#475569;margin:0;font-size:14px;white-space:pre-wrap;">${projectDescription}</p>
    </div>` : ""}
    <p style="color:#475569;line-height:1.7;margin:0 0 4px;">Questions? Contact us:</p>
    ${company.phone ? `<p style="color:#475569;margin:0 0 4px;font-size:14px;">📞 ${company.phone}</p>` : ""}
    ${company.email ? `<p style="color:#475569;margin:0;font-size:14px;">✉️ ${company.email}</p>` : ""}
  </div>
</body></html>`,
      }).catch(() => {});
    }

    // Notify contractor owner/admin
    const ownerUser = await prisma.user.findFirst({
      where: { companyId, role: { in: ["OWNER", "ADMIN"] }, email: { not: undefined } },
    });
    if (ownerUser?.email) {
      resend.emails.send({
        from: `ProEstimate <${fromEmail}>`,
        to: ownerUser.email,
        subject: `New intake form submission — ${name}`,
        html: `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1e293b;">
  <div style="background:#0f172a;padding:24px;border-radius:12px 12px 0 0;">
    <h1 style="color:white;margin:0;font-size:18px;">New Lead: ${name}</h1>
  </div>
  <div style="background:white;border:1px solid #e2e8f0;border-top:none;padding:28px;border-radius:0 0 12px 12px;">
    <p style="color:#475569;margin:0 0 16px;">A new customer submitted your intake form.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px;">
      <tr><td style="padding:6px 0;color:#94a3b8;width:120px;">Name</td><td style="color:#1e293b;font-weight:600;">${name}</td></tr>
      ${email ? `<tr><td style="padding:6px 0;color:#94a3b8;">Email</td><td style="color:#1e293b;">${email}</td></tr>` : ""}
      ${phone ? `<tr><td style="padding:6px 0;color:#94a3b8;">Phone</td><td style="color:#1e293b;">${phone}</td></tr>` : ""}
      ${address ? `<tr><td style="padding:6px 0;color:#94a3b8;">Address</td><td style="color:#1e293b;">${address}${city ? `, ${city}` : ""}</td></tr>` : ""}
      ${squareFootage ? `<tr><td style="padding:6px 0;color:#94a3b8;">Sq Footage</td><td style="color:#1e293b;">${squareFootage} sqft</td></tr>` : ""}
      ${timeline ? `<tr><td style="padding:6px 0;color:#94a3b8;">Timeline</td><td style="color:#1e293b;">${timeline}</td></tr>` : ""}
    </table>
    ${projectDescription ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:20px;">
      <p style="font-size:12px;color:#94a3b8;margin:0 0 6px;text-transform:uppercase;">Project Description</p>
      <p style="color:#475569;margin:0;font-size:14px;white-space:pre-wrap;">${projectDescription}</p>
    </div>` : ""}
    <a href="${appUrl}/estimates/${estimate.id}" style="display:inline-block;background:#0f172a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
      View Draft Estimate →
    </a>
  </div>
</body></html>`,
      }).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true, estimateId: estimate.id, estimateNumber });
}
