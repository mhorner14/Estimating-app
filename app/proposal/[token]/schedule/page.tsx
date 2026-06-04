import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { SchedulingPage } from "@/components/proposal/scheduling-page";

export default async function ProposalSchedulingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const proposal = await prisma.proposal.findUnique({
    where: { publicToken: token },
    include: {
      estimate: {
        include: {
          project: { include: { customer: true } },
          company: true,
          signature: true,
        },
      },
    },
  });

  if (!proposal) notFound();

  // Only accepted proposals can schedule
  if (!["ACCEPTED"].includes(proposal.estimate.status) && proposal.estimate.status !== "DEPOSIT_PAID") {
    notFound();
  }

  return (
    <SchedulingPage
      proposal={proposal as any}
      currentScheduledDate={proposal.estimate.scheduledDate?.toISOString() ?? null}
    />
  );
}
