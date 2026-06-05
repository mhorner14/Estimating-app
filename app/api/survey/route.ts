import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { token, score } = body;

  if (!token || !score || score < 1 || score > 5) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const proposal = await prisma.proposal.findUnique({ where: { publicToken: token } });
  if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.estimate.update({
    where: { id: proposal.estimateId },
    data: { satisfactionScore: score },
  });

  return NextResponse.json({ ok: true });
}
