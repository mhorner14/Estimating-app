import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { CustomerProposalView } from "@/components/proposal/customer-proposal-view";

export default async function CustomerProposalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const proposal = await prisma.proposal.findUnique({
    where: { publicToken: token },
    include: {
      estimate: {
        include: {
          project: { include: { customer: true } },
          lineItems: true,
          signature: true,
          payments: true,
          company: true,
          photos: { where: { photoType: "PROPOSAL_VISIBLE" }, orderBy: { createdAt: "asc" } },
        },
      },
    },
  });

  if (!proposal) notFound();

  // Track view
  await prisma.proposal.update({
    where: { id: proposal.id },
    data: {
      viewCount: { increment: 1 },
      lastViewedAt: new Date(),
      status: proposal.status === "SENT" ? "VIEWED" : proposal.status,
    },
  });

  if (proposal.estimate.status === "SENT") {
    await prisma.estimate.update({
      where: { id: proposal.estimate.id },
      data: { status: "VIEWED", viewedAt: new Date() },
    });
  }

  return <CustomerProposalView proposal={proposal as any} />;
}
