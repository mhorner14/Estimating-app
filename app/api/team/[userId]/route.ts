import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = (session.user as any).companyId;
  const currentRole = (session.user as any).role;

  if (!["OWNER", "ADMIN"].includes(currentRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await params;
  const { role } = await req.json();

  const user = await prisma.user.findFirst({ where: { id: userId, companyId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (user.role === "OWNER") {
    return NextResponse.json({ error: "Cannot change owner role" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role },
    select: { id: true, name: true, email: true, role: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = (session.user as any).companyId;
  const currentRole = (session.user as any).role;

  if (!["OWNER", "ADMIN"].includes(currentRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await params;

  const user = await prisma.user.findFirst({ where: { id: userId, companyId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.role === "OWNER") return NextResponse.json({ error: "Cannot remove the owner" }, { status: 400 });
  if (userId === session.user.id) return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });

  await prisma.user.update({
    where: { id: userId },
    data: { companyId: null, role: "ESTIMATOR" },
  });

  return NextResponse.json({ success: true });
}
