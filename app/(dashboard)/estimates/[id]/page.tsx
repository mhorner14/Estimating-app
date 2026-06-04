import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { EstimateDetail } from "@/components/estimates/estimate-detail";

export default async function EstimateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const companyId = (session?.user as any)?.companyId;

  const estimate = await prisma.estimate.findFirst({
    where: { id, companyId },
    include: {
      project: { include: { customer: true } },
      lineItems: { include: { service: true }, orderBy: { sortOrder: "asc" } },
      proposal: true,
      signature: true,
      payments: { orderBy: { createdAt: "desc" } },
      photos: { orderBy: { sortOrder: "asc" } },
      notes: { include: { user: true }, orderBy: { createdAt: "desc" } },
      company: true,
    },
  });

  if (!estimate) notFound();

  const services = await prisma.service.findMany({
    where: { companyId, isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  return <EstimateDetail estimate={estimate as any} services={services} />;
}
