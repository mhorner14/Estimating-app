import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const estimate = await prisma.estimate.findFirst({
    where: { id, companyId },
    include: {
      project: { include: { customer: true } },
      company: true,
    },
  });

  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const email = estimate.project.customer.email;
  if (!email) return NextResponse.json({ error: "Customer has no email" }, { status: 400 });

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return NextResponse.json({ error: "Email not configured" }, { status: 400 });

  const body = await req.json();
  const { subject, body: emailBody } = body;
  if (!subject || !emailBody) return NextResponse.json({ error: "Missing subject or body" }, { status: 400 });

  const companyName = estimate.company.name;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@proestimate.app";

  const htmlBody = emailBody
    .split("\n\n")
    .map((p: string) => `<p style="color:#475569;line-height:1.6;margin:0 0 16px">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");

  const resend = new Resend(resendKey);
  await resend.emails.send({
    from: `${companyName} <${fromEmail}>`,
    to: email,
    subject,
    html: `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1e293b;">
  <div style="background:#0f172a;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="color:white;margin:0;font-size:20px;">${companyName}</h1>
  </div>
  <div style="background:white;border:1px solid #e2e8f0;border-top:none;padding:32px;border-radius:0 0 12px 12px;">
    ${htmlBody}
    <p style="color:#94a3b8;font-size:12px;margin:24px 0 0">${companyName} · Estimate ${estimate.estimateNumber}</p>
  </div>
</body></html>`,
  });

  await prisma.activityLog.create({
    data: {
      userId: (session.user as any).id,
      entityType: "estimate",
      entityId: id,
      action: "custom_email_sent",
      metadata: { subject, to: email },
    },
  });

  return NextResponse.json({ ok: true });
}
