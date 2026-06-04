import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as any).companyId;
  const estimate = await prisma.estimate.findFirst({ where: { id, companyId } });
  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { url, key, caption, photoType } = body;

  const count = await prisma.photo.count({ where: { estimateId: id } });

  const photo = await prisma.photo.create({
    data: {
      estimateId: id,
      url,
      key,
      caption,
      photoType: photoType || "GENERAL",
      sortOrder: count,
    },
  });

  return NextResponse.json(photo);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as any).companyId;
  const estimate = await prisma.estimate.findFirst({ where: { id, companyId } });
  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const photos = await prisma.photo.findMany({
    where: { estimateId: id },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(photos);
}
