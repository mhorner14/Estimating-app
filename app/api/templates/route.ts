import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const templates = await prisma.estimateTemplate.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const body = await req.json();
  const { name, description, lineItems, notes } = body;
  if (!name || !lineItems) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const template = await prisma.estimateTemplate.create({
    data: { companyId, name, description: description || null, lineItems, notes: notes || null },
  });

  return NextResponse.json(template, { status: 201 });
}
