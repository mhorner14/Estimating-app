import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NewEstimateWizard } from "@/components/estimates/new-estimate-wizard";

export default async function NewEstimatePage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  const { customerId } = await searchParams;
  const session = await auth();
  const companyId = (session?.user as any)?.companyId;

  const [customers, services] = await Promise.all([
    prisma.customer.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
    }),
    prisma.service.findMany({
      where: { companyId, isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">New Estimate</h1>
        <p className="text-slate-500 mt-1">
          Describe the job in your own words — the AI will structure it for you
        </p>
      </div>
      <NewEstimateWizard customers={customers} services={services} preselectedCustomerId={customerId} />
    </div>
  );
}
