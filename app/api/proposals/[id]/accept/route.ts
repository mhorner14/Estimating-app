import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { signerName, signatureData, termsAccepted } = body;

  if (!signerName || !signatureData) {
    return NextResponse.json({ error: "Signature required" }, { status: 400 });
  }

  const proposal = await prisma.proposal.findUnique({
    where: { id },
    include: { estimate: { include: { signature: true } } },
  });

  if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (proposal.estimate.signature) {
    return NextResponse.json({ error: "Already signed" }, { status: 400 });
  }

  const headersList = await headers();
  const ipAddress = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown";
  const userAgent = headersList.get("user-agent") || "";

  await prisma.$transaction([
    prisma.signature.create({
      data: {
        estimateId: proposal.estimateId,
        signerName,
        signatureData,
        ipAddress,
        userAgent,
        estimateVersion: proposal.estimate.version,
        termsAccepted: Boolean(termsAccepted),
      },
    }),
    prisma.estimate.update({
      where: { id: proposal.estimateId },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    }),
    prisma.proposal.update({
      where: { id },
      data: { status: "ACCEPTED" },
    }),
  ]);

  return NextResponse.json({ success: true });
}
