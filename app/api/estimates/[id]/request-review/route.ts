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

  const company = estimate.company;
  const customerName = estimate.project.customer.name;
  const companyName = company.name;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@proestimate.app";

  const googleUrl = (company as any).googleReviewUrl;
  const yelpUrl = (company as any).yelpReviewUrl;

  if (!googleUrl && !yelpUrl) {
    return NextResponse.json({ error: "No review URLs configured. Add them in Settings." }, { status: 400 });
  }

  const reviewButtons = [
    googleUrl && `<a href="${googleUrl}" style="display:inline-block;background:#4285f4;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin:0 8px 8px 0;">⭐ Review on Google</a>`,
    yelpUrl && `<a href="${yelpUrl}" style="display:inline-block;background:#d32323;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin:0 8px 8px 0;">⭐ Review on Yelp</a>`,
  ].filter(Boolean).join("\n");

  const resend = new Resend(resendKey);
  await resend.emails.send({
    from: `${companyName} <${fromEmail}>`,
    to: email,
    subject: `How did we do? — ${companyName}`,
    html: `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1e293b;">
  <div style="background:#0f172a;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="color:white;margin:0;font-size:20px;">${companyName}</h1>
  </div>
  <div style="background:white;border:1px solid #e2e8f0;border-top:none;padding:32px;border-radius:0 0 12px 12px;">
    <p style="font-size:16px;margin:0 0 16px;">Hi ${customerName},</p>
    <p style="color:#475569;line-height:1.6;margin:0 0 24px;">
      Thank you for choosing ${companyName}! We hope you're loving how your project turned out.
      If you have a moment, we'd really appreciate a quick review — it means the world to our small business.
    </p>
    <div style="text-align:center;margin:28px 0;">
      ${reviewButtons}
    </div>
    <p style="color:#94a3b8;font-size:13px;text-align:center;">
      It only takes 30 seconds and helps us continue doing great work in the community.
    </p>
    <p style="color:#475569;margin:24px 0 0;font-size:14px;">
      Thank you again,<br/>
      <strong>${companyName}</strong>
    </p>
  </div>
</body></html>`,
  });

  await prisma.activityLog.create({
    data: {
      userId: (session.user as any).id,
      entityType: "estimate",
      entityId: id,
      action: "review_requested",
      metadata: { customerEmail: email },
    },
  });

  return NextResponse.json({ ok: true });
}
