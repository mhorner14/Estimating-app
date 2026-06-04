import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as any).companyId;
  const currentRole = (session.user as any).role;

  if (!["OWNER", "ADMIN"].includes(currentRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const target = await prisma.user.findFirst({ where: { id: userId, companyId } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { role } = await req.json();
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as any).companyId;
  const currentRole = (session.user as any).role;

  if (!["OWNER", "ADMIN"].includes(currentRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (userId === session.user.id) {
    return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId, companyId },
    data: { companyId: null },
  });

  return NextResponse.json({ ok: true });
}
