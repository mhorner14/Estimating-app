import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CustomerPortalView } from "@/components/portal/customer-portal-view";

export default async function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const customer = await prisma.customer.findUnique({
    where: { portalToken: token },
    include: {
      company: { select: { name: true, phone: true, email: true, address: true, city: true, state: true } },
      projects: {
        include: {
          estimates: {
            include: {
              proposal: true,
              photos: {
                where: { photoType: { in: ["BEFORE", "AFTER", "PROPOSAL_VISIBLE"] } },
                orderBy: { sortOrder: "asc" },
                take: 12,
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!customer) notFound();

  const WON = ["ACCEPTED", "DEPOSIT_PAID", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "BALANCE_DUE", "PAID_IN_FULL"];

  const serialized = {
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    company: customer.company,
    estimates: customer.projects.flatMap((p) =>
      p.estimates.map((e) => ({
        id: e.id,
        estimateNumber: e.estimateNumber,
        status: e.status,
        totalAmount: Number(e.totalAmount),
        createdAt: e.createdAt.toISOString(),
        projectName: p.name,
        projectAddress: p.address || customer.projectAddress || "",
        proposalToken: e.proposal?.publicToken ?? null,
        isWon: WON.includes(e.status),
        scheduledDate: e.scheduledDate ? e.scheduledDate.toISOString() : null,
        photos: e.photos.map((ph) => ({ id: ph.id, url: ph.url, caption: ph.caption, photoType: ph.photoType })),
      }))
    ),
  };

  return <CustomerPortalView data={serialized} />;
}
