import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, PlusCircle, Tag } from "lucide-react";
import { formatCurrency, formatDate, ESTIMATE_STATUS_LABELS, ESTIMATE_STATUS_COLORS } from "@/lib/utils";
import { CustomerContactCard } from "@/components/customers/customer-contact-card";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const companyId = (session?.user as any)?.companyId;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      projects: {
        include: {
          estimates: {
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!customer || customer.companyId !== companyId) notFound();

  const allEstimates = customer.projects.flatMap((p) => p.estimates);
  const totalRevenue = allEstimates
    .filter((e) => e.status === "ACCEPTED" || e.status === "COMPLETED" || e.status === "DEPOSIT_PAID" || e.status === "PAID_IN_FULL")
    .reduce((sum, e) => sum + Number(e.totalAmount), 0);

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/customers">
            <ArrowLeft className="w-4 h-4 mr-1" /> Customers
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{customer.name}</h1>
          {customer.leadSource && (
            <p className="text-slate-500 text-sm mt-0.5 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" /> {customer.leadSource}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/customers/${customer.id}/statement`}>
              Statement
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/estimates/new?customerId=${customer.id}`}>
              <PlusCircle className="w-4 h-4 mr-2" /> New Estimate
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <CustomerContactCard customer={customer} />

          <div className="grid grid-cols-2 gap-3">
            <Card className="text-center p-4">
              <p className="text-2xl font-bold text-slate-900">{allEstimates.length}</p>
              <p className="text-xs text-slate-500 mt-0.5">Total Estimates</p>
            </Card>
            <Card className="text-center p-4">
              <p className="text-lg font-bold text-emerald-600">{formatCurrency(totalRevenue)}</p>
              <p className="text-xs text-slate-500 mt-0.5">Won Revenue</p>
            </Card>
          </div>

          <p className="text-xs text-slate-400">Customer since {formatDate(customer.createdAt)}</p>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-base font-semibold text-slate-900">Estimate History</h2>

          {allEstimates.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg text-slate-400">
              <p className="text-sm">No estimates yet for this customer</p>
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left p-3 text-xs font-medium text-slate-500">Estimate #</th>
                      <th className="text-left p-3 text-xs font-medium text-slate-500">Date</th>
                      <th className="text-right p-3 text-xs font-medium text-slate-500">Total</th>
                      <th className="text-left p-3 text-xs font-medium text-slate-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allEstimates.map((estimate) => (
                      <tr key={estimate.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                        <td className="p-3">
                          <Link href={`/estimates/${estimate.id}`} className="text-sm font-medium text-blue-600 hover:underline font-mono">
                            {estimate.estimateNumber}
                          </Link>
                        </td>
                        <td className="p-3 text-sm text-slate-600">{formatDate(estimate.createdAt)}</td>
                        <td className="p-3 text-right text-sm font-semibold text-slate-900">{formatCurrency(Number(estimate.totalAmount))}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTIMATE_STATUS_COLORS[estimate.status as keyof typeof ESTIMATE_STATUS_COLORS]}`}>
                            {ESTIMATE_STATUS_LABELS[estimate.status as keyof typeof ESTIMATE_STATUS_LABELS]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
