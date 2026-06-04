import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; photoId: string }> }) {
  const { id, photoId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as any).companyId;
  const estimate = await prisma.estimate.findFirst({ where: { id, companyId } });
  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.photo.update({
    where: { id: photoId },
    data: {
      ...(body.caption !== undefined && { caption: body.caption }),
      ...(body.photoType !== undefined && { photoType: body.photoType }),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; photoId: string }> }) {
  const { id, photoId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as any).companyId;
  const estimate = await prisma.estimate.findFirst({ where: { id, companyId } });
  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.photo.delete({ where: { id: photoId } });
  return NextResponse.json({ ok: true });
}
