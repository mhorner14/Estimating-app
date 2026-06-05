import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ChangeOrderApprovalView } from "@/components/change-orders/change-order-approval-view";

export default async function ChangeOrderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const co = await prisma.changeOrder.findUnique({
    where: { publicToken: token },
    include: {
      estimate: {
        include: {
          project: { include: { customer: true } },
          company: true,
        },
      },
    },
  });

  if (!co) notFound();

  const data = {
    id: co.id,
    number: co.number,
    description: co.description,
    amount: Number(co.amount),
    status: co.status,
    lineItems: (co.lineItems as any[]) || [],
    company: {
      name: co.estimate.company.name,
      logo: co.estimate.company.logo,
      phone: co.estimate.company.phone,
      email: co.estimate.company.email,
    },
    customer: {
      name: co.estimate.project.customer.name,
    },
    estimateNumber: co.estimate.estimateNumber,
    token,
  };

  return <ChangeOrderApprovalView data={data} />;
}
