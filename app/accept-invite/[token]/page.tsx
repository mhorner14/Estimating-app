import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { AcceptInviteView } from "@/components/team/accept-invite-view";

export default async function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { company: { select: { name: true, logo: true } } },
  });

  if (!invitation || invitation.expiresAt < new Date() || invitation.acceptedAt) {
    notFound();
  }

  return (
    <AcceptInviteView
      token={token}
      email={invitation.email}
      role={invitation.role}
      companyName={invitation.company.name}
      companyLogo={invitation.company.logo}
    />
  );
}
