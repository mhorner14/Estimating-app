import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { sendSignedConfirmationEmail } from "@/lib/email";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { signerName, signatureData, termsAccepted } = body;

  if (!signerName || !signatureData) {
    return NextResponse.json({ error: "Signature required" }, { status: 400 });
  }

  const proposal = await prisma.proposal.findUnique({
    where: { id },
    include: {
      estimate: {
        include: {
          signature: true,
          project: { include: { customer: true } },
          company: true,
        },
      },
    },
  });

  if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (proposal.estimate.signature) {
    return NextResponse.json({ error: "Already signed" }, { status: 400 });
  }

  const headersList = await headers();
  const ipAddress =
    headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown";
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

  // Send confirmation email
  const customerEmail = proposal.estimate.project.customer.email;
  if (customerEmail && process.env.RESEND_API_KEY) {
    const proposalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/proposal/${proposal.publicToken}`;
    await sendSignedConfirmationEmail({
      to: customerEmail,
      customerName: proposal.estimate.project.customer.name,
      companyName: proposal.estimate.company.name,
      estimateNumber: proposal.estimate.estimateNumber,
      proposalUrl,
    });
  }

  return NextResponse.json({ success: true });
}
