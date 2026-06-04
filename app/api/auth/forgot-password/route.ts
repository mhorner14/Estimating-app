import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email } });

  // Always return 200 to avoid user enumeration
  if (!user || !user.password) {
    return NextResponse.json({ ok: true });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  // Store in VerificationToken
  await prisma.verificationToken.upsert({
    where: { identifier_token: { identifier: `reset:${email}`, token } },
    create: { identifier: `reset:${email}`, token, expires },
    update: { token, expires },
  }).catch(async () => {
    // If upsert fails due to existing token, delete and recreate
    await prisma.verificationToken.deleteMany({ where: { identifier: `reset:${email}` } });
    await prisma.verificationToken.create({ data: { identifier: `reset:${email}`, token, expires } });
  });

  if (process.env.RESEND_API_KEY) {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://proestimate.app";
    const resetUrl = `${appUrl}/reset-password?token=${token}`;
    const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@proestimate.app";

    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "Reset your ProEstimate password",
      html: `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1e293b;">
  <h2>Reset your password</h2>
  <p>Click the button below to reset your ProEstimate password. This link expires in 1 hour.</p>
  <a href="${resetUrl}" style="background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0">Reset Password</a>
  <p style="color:#94a3b8;font-size:12px;margin-top:24px">If you didn't request this, you can safely ignore this email. The link expires in 1 hour.</p>
</body></html>`,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
