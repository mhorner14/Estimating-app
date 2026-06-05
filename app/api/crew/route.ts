import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const crew = await prisma.crewMember.findMany({
    where: { companyId, isActive: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(crew);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const { name, email, phone, role } = await req.json();
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const member = await prisma.crewMember.create({
    data: { companyId, name, email, phone, role },
  });

  return NextResponse.json(member);
}
