import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const companyId = (session?.user as any)?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const estimate = await prisma.estimate.findFirst({
    where: { id, companyId },
    include: {
      project: { include: { customer: true } },
      company: { select: { name: true, phone: true, accentColor: true, googleReviewUrl: true } },
    },
  });

  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const email = estimate.project.customer.email;
  if (!email) return NextResponse.json({ error: "Customer has no email" }, { status: 400 });

  if (!(estimate.company as any).googleReviewUrl) {
    return NextResponse.json({ error: "No Google Review URL configured in Settings" }, { status: 400 });
  }

  const alreadySent = await prisma.activityLog.findFirst({
    where: { entityId: id, action: "review_request_sent" },
  });
  if (alreadySent) return NextResponse.json({ error: "Review request already sent" }, { status: 400 });

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "Email not configured" }, { status: 400 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@proestimate.app";
  const companyName = (estimate.company as any).name;
  const customerName = estimate.project.customer.name;
  const accentColor = (estimate.company as any).accentColor || "#0f172a";
  const reviewUrl = (estimate.company as any).googleReviewUrl;

  await resend.emails.send({
    from: `${companyName} <${fromEmail}>`,
    to: email,
    subject: `How did we do? — ${companyName}`,
    html: `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1e293b;background:#f8fafc;">
  <div style="background:${accentColor};padding:24px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="color:white;margin:0;font-size:18px;font-weight:700;">${companyName}</h1>
  </div>
  <div style="background:white;border:1px solid #e2e8f0;border-top:none;padding:32px;border-radius:0 0 12px 12px;">
    <p style="font-size:16px;margin:0 0 16px;">Hi ${customerName},</p>
    <p style="color:#475569;line-height:1.7;margin:0 0 16px;">
      Thank you for choosing ${companyName}! We hope you're loving the results.
    </p>
    <p style="color:#475569;line-height:1.7;margin:0 0 24px;">
      If you're happy with our work, we'd really appreciate a quick Google review. It takes less than a minute and means the world to our small business.
    </p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${reviewUrl}" style="display:inline-block;background:${accentColor};color:white;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">
        Leave a Google Review
      </a>
    </div>
    <p style="color:#94a3b8;font-size:13px;text-align:center;margin-top:20px;">
      Thank you for your support!
    </p>
  </div>
</body></html>`,
  });

  await prisma.activityLog.create({
    data: {
      entityType: "estimate",
      entityId: id,
      action: "review_request_sent",
      metadata: { customerEmail: email, sentAt: new Date().toISOString() },
    },
  });

  return NextResponse.json({ ok: true });
}
