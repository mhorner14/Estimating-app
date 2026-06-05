import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BillingView } from "@/components/billing/billing-view";

export default async function BillingPage() {
  const session = await auth();
  const companyId = (session?.user as any)?.companyId;

  const [company, estimateCount, customerCount] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: { plan: true, trialEndsAt: true, stripeSubscriptionId: true, name: true },
    }),
    prisma.estimate.count({ where: { companyId } }),
    prisma.customer.count({ where: { companyId } }),
  ]);

  const thisMonthStart = new Date();
  thisMonthStart.setDate(1);
  thisMonthStart.setHours(0, 0, 0, 0);

  const monthlyEstimates = await prisma.estimate.count({
    where: { companyId, createdAt: { gte: thisMonthStart } },
  });

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Billing & Plan</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your subscription and usage.</p>
      </div>
      <BillingView
        company={{ plan: (company as any)?.plan || "FREE", trialEndsAt: (company as any)?.trialEndsAt?.toISOString() ?? null, hasSubscription: !!(company as any)?.stripeSubscriptionId }}
        usage={{ estimateCount, customerCount, monthlyEstimates }}
      />
    </div>
  );
}
