import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SatisfactionSurveyView } from "@/components/survey/satisfaction-survey-view";

export default async function SurveyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // Token is the proposal's publicToken
  const proposal = await prisma.proposal.findUnique({
    where: { publicToken: token },
    include: {
      estimate: {
        include: {
          project: { include: { customer: true } },
          company: { select: { name: true, googleReviewUrl: true, yelpReviewUrl: true } },
        },
      },
    },
  });

  if (!proposal) notFound();

  const estimate = proposal.estimate;
  if (!["COMPLETED", "PAID_IN_FULL"].includes(estimate.status)) notFound();

  return (
    <SatisfactionSurveyView
      estimateId={estimate.id}
      token={token}
      customerName={estimate.project.customer.name}
      companyName={estimate.company.name}
      alreadyRated={estimate.satisfactionScore !== null}
      googleReviewUrl={(estimate.company as any).googleReviewUrl ?? null}
      yelpReviewUrl={(estimate.company as any).yelpReviewUrl ?? null}
    />
  );
}
