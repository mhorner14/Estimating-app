import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const estimate = await prisma.estimate.findFirst({
    where: { crewPhotoToken: token },
    include: {
      project: { include: { customer: true } },
      photos: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!estimate) return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  return NextResponse.json({
    estimateNumber: estimate.estimateNumber,
    customerName: estimate.project.customer.name,
    address: estimate.project.address || estimate.project.customer.projectAddress,
    crewNotes: estimate.crewNotes,
    photos: estimate.photos,
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const estimate = await prisma.estimate.findFirst({ where: { crewPhotoToken: token } });
  if (!estimate) return NextResponse.json({ error: "Invalid token" }, { status: 404 });

  const { url, key, caption, photoType } = await req.json();
  if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

  const count = await prisma.photo.count({ where: { estimateId: estimate.id } });
  const photo = await prisma.photo.create({
    data: { estimateId: estimate.id, url, key, caption, photoType: photoType || "AFTER", sortOrder: count },
  });
  return NextResponse.json(photo);
}
