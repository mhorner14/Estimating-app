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

  const wasFirstView = proposal.estimate.status === "SENT";

  if (wasFirstView) {
    await prisma.estimate.update({
      where: { id: proposal.estimate.id },
      data: { status: "VIEWED", viewedAt: new Date() },
    });

    // Notify contractor on first view
    const companyEmail = proposal.estimate.company?.email;
    if (companyEmail && process.env.RESEND_API_KEY) {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const fromEmail = process.env.RESEND_FROM_EMAIL || "proposals@proestimate.app";
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://proestimate.app";
      const customerName = proposal.estimate.project.customer.name;
      const estimateNumber = proposal.estimate.estimateNumber;
      const companyName = proposal.estimate.company.name;

      await resend.emails.send({
        from: fromEmail,
        to: companyEmail,
        subject: `👀 ${customerName} viewed your proposal`,
        html: `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1e293b;">
  <h2 style="margin-bottom:8px;">Proposal Viewed</h2>
  <p style="color:#475569;"><strong>${customerName}</strong> just opened proposal <strong>${estimateNumber}</strong>. This is a great time to follow up!</p>
  <a href="${appUrl}/estimates/${proposal.estimateId}" style="background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:12px">View Estimate</a>
  <p style="color:#94a3b8;font-size:12px;margin-top:16px">${companyName}</p>
</body></html>`,
      }).catch(() => {});
    }
  }

  return <CustomerProposalView proposal={proposal as any} />;
}
