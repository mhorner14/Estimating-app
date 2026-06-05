import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = (session.user as any).companyId;
  const { id } = await params;

  const body = await req.json();
  const member = await prisma.crewMember.findFirst({ where: { id, companyId } });
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.crewMember.update({ where: { id }, data: body });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = (session.user as any).companyId;
  const { id } = await params;

  await prisma.crewMember.updateMany({ where: { id, companyId }, data: { isActive: false } });
  return NextResponse.json({ success: true });
}
