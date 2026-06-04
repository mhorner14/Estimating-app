import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendProposalEmail } from "@/lib/email";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as any).companyId;

  const estimate = await prisma.estimate.findFirst({
    where: { id, companyId },
    include: {
      proposal: true,
      project: { include: { customer: true } },
      company: true,
    },
  });

  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.estimate.update({
    where: { id },
    data: { status: "SENT", sentAt: new Date() },
    include: {
      project: { include: { customer: true } },
      lineItems: { include: { service: true } },
      proposal: true,
      signature: true,
      payments: true,
      company: true,
      notes: { include: { user: true } },
      photos: true,
    },
  });

  if (estimate.proposal) {
    await prisma.proposal.update({
      where: { id: estimate.proposal.id },
      data: { status: "SENT" },
    });
  }

  // Send email if customer has an email and Resend is configured
  const customerEmail = estimate.project.customer.email;
  if (customerEmail && process.env.RESEND_API_KEY && estimate.proposal?.publicToken) {
    const proposalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/proposal/${estimate.proposal.publicToken}`;
    await sendProposalEmail({
      to: customerEmail,
      customerName: estimate.project.customer.name,
      companyName: estimate.company.name,
      estimateNumber: estimate.estimateNumber,
      totalAmount: Number(estimate.totalAmount),
      proposalUrl,
      depositAmount: Number(estimate.depositAmount),
      customSubject: estimate.company.proposalEmailSubject,
      customBody: estimate.company.proposalEmailBody,
      trackingToken: estimate.proposal.publicToken,
    });
  }

  return NextResponse.json(updated);
}
