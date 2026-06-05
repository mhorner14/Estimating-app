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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const estimate = await prisma.estimate.findFirst({ where: { crewPhotoToken: token } });
  if (!estimate) return NextResponse.json({ error: "Invalid token" }, { status: 404 });

  const { startTime, endTime, materialNotes, issuesNotes, crewNotes } = await req.json();

  const updateData: any = {};
  if (crewNotes !== undefined) updateData.crewNotes = crewNotes;

  // Append completion notes to crewNotes
  const completionNote = [
    startTime && `Start: ${startTime}`,
    endTime && `End: ${endTime}`,
    materialNotes && `Materials: ${materialNotes}`,
    issuesNotes && `Issues: ${issuesNotes}`,
  ].filter(Boolean).join(" | ");

  if (completionNote) {
    const existing = estimate.crewNotes || "";
    updateData.crewNotes = existing
      ? `${existing}\n\n--- Completion Report ---\n${completionNote}`
      : `--- Completion Report ---\n${completionNote}`;
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.estimate.update({ where: { id: estimate.id }, data: updateData });
  }

  await prisma.activityLog.create({
    data: {
      entityType: "estimate",
      entityId: estimate.id,
      action: "crew_completion_submitted",
      metadata: { startTime, endTime, materialNotes: materialNotes?.slice(0, 100) },
    },
  });

  return NextResponse.json({ ok: true });
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
