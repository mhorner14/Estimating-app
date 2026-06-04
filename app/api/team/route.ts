import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as any).companyId;

  const members = await prisma.user.findMany({
    where: { companyId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(members);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as any).companyId;
  const currentRole = (session.user as any).role;

  if (!["OWNER", "ADMIN"].includes(currentRole)) {
    return NextResponse.json({ error: "Only owners and admins can invite team members" }, { status: 403 });
  }

  const { name, email, role = "ESTIMATOR", password } = await req.json();

  if (!email || !name) {
    return NextResponse.json({ error: "Name and email required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.companyId === companyId) {
      return NextResponse.json({ error: "User already on your team" }, { status: 400 });
    }
    // Add existing user to this company
    const updated = await prisma.user.update({
      where: { email },
      data: { companyId, role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    return NextResponse.json(updated);
  }

  // Create new user
  const tempPassword = password || Math.random().toString(36).slice(-10);
  const hashed = await bcrypt.hash(tempPassword, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      role,
      companyId,
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  // Send invite email if Resend configured
  if (process.env.RESEND_API_KEY) {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.RESEND_FROM_EMAIL || "proposals@proestimate.app";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://proestimate.app";

    const company = await prisma.company.findUnique({ where: { id: companyId } });

    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `You've been invited to join ${company?.name || "ProEstimate"}`,
      html: `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1e293b;">
  <h2>You've been invited!</h2>
  <p>${(session.user as any).name || "Your team lead"} has invited you to join <strong>${company?.name || "their company"}</strong> on ProEstimate.</p>
  <p>Login details:</p>
  <ul>
    <li>Email: <strong>${email}</strong></li>
    <li>Temporary password: <strong>${tempPassword}</strong></li>
  </ul>
  <p><a href="${appUrl}/login" style="background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:8px">Sign In</a></p>
  <p style="color:#94a3b8;font-size:12px;margin-top:16px">Please change your password after signing in.</p>
</body></html>`,
    }).catch(() => {});
  }

  return NextResponse.json({ ...user, tempPassword: !password ? tempPassword : undefined });
}
