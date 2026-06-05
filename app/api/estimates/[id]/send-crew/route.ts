import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const { id } = await params;
  const { crewEmails, message } = await req.json();

  if (!crewEmails?.length) {
    return NextResponse.json({ error: "At least one crew email required" }, { status: 400 });
  }

  const estimate = await prisma.estimate.findFirst({
    where: { id, companyId },
    include: {
      project: { include: { customer: true } },
      company: true,
      lineItems: { where: { isOptional: false }, orderBy: { sortOrder: "asc" } },
    },
  });

  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@proestimate.app";

  const customer = estimate.project.customer;
  const scheduledStr = estimate.scheduledDate
    ? new Date(estimate.scheduledDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : "TBD";

  const lineItemsHtml = estimate.lineItems
    .map(
      (li) =>
        `<tr><td style="padding:4px 8px;border-bottom:1px solid #e2e8f0">${li.description}</td><td style="padding:4px 8px;border-bottom:1px solid #e2e8f0;text-align:right">${li.quantity} ${li.unit}</td></tr>`
    )
    .join("");

  const html = `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1e293b;">
<h2 style="color:#1e293b;margin-bottom:4px;">Job Details — ${estimate.estimateNumber}</h2>
<p style="color:#64748b;margin-top:0;">${estimate.company.name}</p>
<hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;" />
<table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
  <tr><td style="padding:4px 0;color:#64748b;width:140px">Customer</td><td style="padding:4px 0;font-weight:600">${customer.name}</td></tr>
  <tr><td style="padding:4px 0;color:#64748b">Phone</td><td style="padding:4px 0">${customer.phone || "N/A"}</td></tr>
  <tr><td style="padding:4px 0;color:#64748b">Address</td><td style="padding:4px 0">${customer.projectAddress || ""}${customer.city ? `, ${customer.city}` : ""}${customer.state ? `, ${customer.state}` : ""}</td></tr>
  <tr><td style="padding:4px 0;color:#64748b">Scheduled</td><td style="padding:4px 0;font-weight:600;color:#2563eb">${scheduledStr}</td></tr>
  ${estimate.colorSelection ? `<tr><td style="padding:4px 0;color:#64748b">Color</td><td style="padding:4px 0">${estimate.colorSelection}</td></tr>` : ""}
  ${estimate.squareFootage ? `<tr><td style="padding:4px 0;color:#64748b">Square Footage</td><td style="padding:4px 0">${estimate.squareFootage} sq ft</td></tr>` : ""}
</table>
${lineItemsHtml ? `<h3 style="font-size:14px;color:#475569;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">Scope of Work</h3><table style="width:100%;border-collapse:collapse;font-size:14px;">${lineItemsHtml}</table><br/>` : ""}
${estimate.crewNotes ? `<h3 style="font-size:14px;color:#475569;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">Crew Notes</h3><p style="color:#475569;white-space:pre-wrap;">${estimate.crewNotes}</p>` : ""}
${message ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-top:16px;"><p style="margin:0;color:#475569;font-size:14px;">${message}</p></div>` : ""}
<p style="color:#94a3b8;font-size:12px;margin-top:24px;">${estimate.company.name}${estimate.company.phone ? ` · ${estimate.company.phone}` : ""}</p>
</body></html>`;

  const result = await resend.emails.send({
    from: fromEmail,
    to: crewEmails,
    subject: `Job Sheet — ${estimate.estimateNumber} — ${customer.name} — ${scheduledStr}`,
    html,
  });

  if (result.error) {
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  await prisma.activityLog.create({
    data: {
      userId: session.user.id,
      entityType: "estimate",
      entityId: id,
      action: "crew_notified",
      metadata: { emails: crewEmails },
    },
  });

  return NextResponse.json({ success: true });
}
