import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { EstimatesView } from "@/components/estimates/estimates-view";
import { QuickEstimatePanel } from "@/components/estimates/quick-estimate-panel";

export default async function EstimatesPage() {
  const session = await auth();
  const companyId = (session?.user as any)?.companyId;

  const [estimates, services, customers] = await Promise.all([
    prisma.estimate.findMany({
      where: { companyId },
      include: { project: { include: { customer: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.service.findMany({ where: { companyId, isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.customer.findMany({ where: { companyId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const serialized = estimates.map((e) => ({
    id: e.id,
    estimateNumber: e.estimateNumber,
    status: e.status,
    totalAmount: Number(e.totalAmount),
    createdAt: e.createdAt.toISOString(),
    sentAt: e.sentAt?.toISOString() ?? null,
    project: {
      customer: {
        name: e.project.customer.name,
        phone: e.project.customer.phone,
      },
    },
  }));

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Estimates</h1>
          <p className="text-slate-500 text-sm mt-1">{estimates.length} total estimates</p>
        </div>
        <Button asChild>
          <Link href="/estimates/new">
            <PlusCircle className="w-4 h-4 mr-2" /> New Estimate
          </Link>
        </Button>
      </div>

      {estimates.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <p className="text-lg font-medium">No estimates yet</p>
          <p className="text-sm mt-1 mb-4">Create your first estimate to get started</p>
          <Button asChild><Link href="/estimates/new">Create Estimate</Link></Button>
        </div>
      ) : (
        <div className="flex gap-6">
          <div className="flex-1 min-w-0">
            <EstimatesView estimates={serialized} />
          </div>
          {services.length > 0 && customers.length > 0 && (
            <div className="w-64 shrink-0 hidden xl:block">
              <QuickEstimatePanel
                services={services.map((s) => ({
                  id: s.id,
                  name: s.name,
                  basePrice: Number(s.basePrice),
                  pricingType: s.pricingType,
                  minCharge: Number(s.minCharge),
                }))}
                customers={customers}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
