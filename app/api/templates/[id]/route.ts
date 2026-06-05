import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const template = await prisma.estimateTemplate.findFirst({ where: { id, companyId } });
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.estimateTemplate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const template = await prisma.estimateTemplate.findFirst({ where: { id, companyId } });
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.estimateTemplate.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.lineItems !== undefined && { lineItems: body.lineItems }),
      ...(body.notes !== undefined && { notes: body.notes }),
    },
  });
  return NextResponse.json(updated);
}
