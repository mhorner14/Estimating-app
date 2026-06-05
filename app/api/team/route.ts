import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const [members, invitations] = await Promise.all([
    prisma.user.findMany({
      where: { companyId },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.invitation.findMany({
      where: { companyId, acceptedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, email: true, role: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ members, invitations });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = (session.user as any).companyId;
  const currentRole = (session.user as any).role;

  if (!["OWNER", "ADMIN"].includes(currentRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { email, role } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const existing = await prisma.user.findFirst({ where: { email, companyId } });
  if (existing) return NextResponse.json({ error: "User already on your team" }, { status: 409 });

  await prisma.invitation.deleteMany({
    where: { companyId, email, acceptedAt: null },
  });

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const invitation = await prisma.invitation.create({
    data: {
      companyId,
      email,
      role: role || "ESTIMATOR",
      invitedBy: session.user.id,
      expiresAt,
    },
  });

  if (process.env.RESEND_API_KEY) {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://proestimate.app";
    const company = await prisma.company.findUnique({ where: { id: companyId }, select: { name: true } });

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "noreply@proestimate.app",
      to: email,
      subject: `You've been invited to join ${company?.name || "ProEstimate"}`,
      html: `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1e293b;">
  <h2>You're invited!</h2>
  <p><strong>${session.user.name || "A team member"}</strong> has invited you to join <strong>${company?.name || "their team"}</strong> on ProEstimate.</p>
  <p style="color:#475569;">You'll be joining as: <strong>${role || "Estimator"}</strong></p>
  <a href="${appUrl}/accept-invite/${invitation.token}" style="background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:12px">Accept Invitation</a>
  <p style="color:#94a3b8;font-size:12px;margin-top:16px">This invitation expires in 7 days.</p>
</body></html>`,
    }).catch(() => {});
  }

  return NextResponse.json({ success: true, invitation });
}
