import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as any).companyId;

  const customer = await prisma.customer.findFirst({ where: { id, companyId } });
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Reuse existing token or generate new one
  const token = customer.portalToken || randomBytes(24).toString("hex");
  if (!customer.portalToken) {
    await prisma.customer.update({ where: { id }, data: { portalToken: token } });
  }

  const url = `${process.env.NEXT_PUBLIC_APP_URL}/portal/${token}`;
  return NextResponse.json({ url, token });
}
