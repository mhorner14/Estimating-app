import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

export async function POST(req: NextRequest) {
  const { token, name, password } = await req.json();

  if (!token || !name || !password) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }

  const invitation = await prisma.invitation.findUnique({ where: { token } });

  if (!invitation || invitation.expiresAt < new Date() || invitation.acceptedAt) {
    return NextResponse.json({ error: "Invitation is invalid or expired" }, { status: 400 });
  }

  const hashedPassword = await hash(password, 12);

  const existingUser = await prisma.user.findUnique({ where: { email: invitation.email } });

  if (existingUser) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { companyId: invitation.companyId, role: invitation.role, name: existingUser.name || name },
    });
  } else {
    await prisma.user.create({
      data: {
        email: invitation.email,
        name,
        password: hashedPassword,
        role: invitation.role,
        companyId: invitation.companyId,
      },
    });
  }

  await prisma.invitation.update({
    where: { id: invitation.id },
    data: { acceptedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
