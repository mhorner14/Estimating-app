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
      proposal: true,
      company: { select: { name: true, accentColor: true } },
    },
  });

  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const email = estimate.project.customer.email;
  if (!email) return NextResponse.json({ error: "Customer has no email" }, { status: 400 });

  if (!estimate.proposal?.publicToken) {
    return NextResponse.json({ error: "No proposal found for this estimate" }, { status: 400 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return NextResponse.json({ error: "Email not configured" }, { status: 400 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.proestimate.io";
  const surveyUrl = `${appUrl}/survey/${estimate.proposal.publicToken}`;
  const companyName = estimate.company.name;
  const customerName = estimate.project.customer.name;
  const accentColor = estimate.company.accentColor || "#0f172a";
  const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@proestimate.app";

  const resend = new Resend(resendKey);
  await resend.emails.send({
    from: `${companyName} <${fromEmail}>`,
    to: email,
    subject: `How was your experience with ${companyName}?`,
    html: `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1e293b;background:#f8fafc;">
  <div style="background:${accentColor};padding:28px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="color:white;margin:0;font-size:20px;font-weight:700;">${companyName}</h1>
  </div>
  <div style="background:white;border:1px solid #e2e8f0;border-top:none;padding:36px;border-radius:0 0 12px 12px;">
    <p style="font-size:16px;margin:0 0 12px;">Hi ${customerName},</p>
    <p style="color:#475569;line-height:1.7;margin:0 0 8px;">
      Thank you for choosing ${companyName} — we hope you love your finished project!
    </p>
    <p style="color:#475569;line-height:1.7;margin:0 0 28px;">
      Your feedback helps us improve and lets other homeowners know what to expect.
      It takes less than a minute — just click below:
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${surveyUrl}" style="display:inline-block;background:${accentColor};color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.01em;">
        ⭐ Rate Your Experience
      </a>
    </div>
    <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:24px;">
      Questions? Reply to this email and we'll be happy to help.
    </p>
  </div>
</body></html>`,
  });

  await prisma.activityLog.create({
    data: {
      userId: (session.user as any).id,
      entityType: "estimate",
      entityId: id,
      action: "survey_sent",
      metadata: { customerEmail: email, surveyUrl },
    },
  });

  return NextResponse.json({ ok: true });
}
