import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { CustomerStatementView } from "@/components/customers/customer-statement-view";

export default async function CustomerStatementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const companyId = (session?.user as any)?.companyId;

  const [customer, company] = await Promise.all([
    prisma.customer.findUnique({
      where: { id },
      include: {
        projects: {
          include: {
            estimates: {
              include: { payments: true, lineItems: true },
              orderBy: { createdAt: "desc" },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.company.findUnique({ where: { id: companyId }, select: { name: true, logo: true, phone: true, email: true, address: true, city: true, state: true, zip: true, licenseNumber: true } }),
  ]);

  if (!customer || customer.companyId !== companyId) notFound();

  const serialized = {
    customer: {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      projectAddress: customer.projectAddress,
      city: customer.city,
      state: customer.state,
    },
    company: {
      name: company?.name || "",
      logo: company?.logo || null,
      phone: company?.phone || null,
      email: company?.email || null,
      address: company?.address || null,
      city: company?.city || null,
      state: company?.state || null,
      zip: company?.zip || null,
      licenseNumber: company?.licenseNumber || null,
    },
    estimates: customer.projects.flatMap((p) =>
      p.estimates.map((e) => ({
        id: e.id,
        estimateNumber: e.estimateNumber,
        status: e.status,
        totalAmount: Number(e.totalAmount),
        depositAmount: Number(e.depositAmount),
        balanceDue: Number(e.balanceDue),
        createdAt: e.createdAt.toISOString(),
        projectName: p.name,
        payments: e.payments.map((pay) => ({
          id: pay.id,
          amount: Number(pay.amount),
          type: pay.type,
          method: null,
          paidAt: pay.paidAt?.toISOString() ?? pay.createdAt.toISOString(),
        })),
      }))
    ),
    generatedAt: new Date().toISOString(),
  };

  return <CustomerStatementView data={serialized} />;
}
