import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ServicesManager } from "@/components/services/services-manager";

export default async function ServicesPage() {
  const session = await auth();
  const companyId = (session?.user as any)?.companyId;

  const services = await prisma.service.findMany({
    where: { companyId },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Services & Pricing</h1>
        <p className="text-slate-500 text-sm mt-1">
          Manage your service catalog and pricing rules. The AI uses this to price estimates.
        </p>
      </div>
      <ServicesManager services={services} companyId={companyId} />
    </div>
  );
}
