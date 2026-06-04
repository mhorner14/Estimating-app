import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Search } from "lucide-react";
import { formatCurrency, formatDate, ESTIMATE_STATUS_LABELS, ESTIMATE_STATUS_COLORS } from "@/lib/utils";

export default async function EstimatesPage() {
  const session = await auth();
  const companyId = (session?.user as any)?.companyId;

  const estimates = await prisma.estimate.findMany({
    where: { companyId },
    include: {
      project: { include: { customer: true } },
    },
    orderBy: { createdAt: "desc" },
  });

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

      <Card>
        <CardContent className="p-0">
          {estimates.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <p className="text-lg font-medium">No estimates yet</p>
              <p className="text-sm mt-1 mb-4">Create your first estimate to get started</p>
              <Button asChild><Link href="/estimates/new">Create Estimate</Link></Button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Customer</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Estimate #</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Date</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-600">Total</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {estimates.map((estimate) => (
                  <tr key={estimate.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <Link href={`/estimates/${estimate.id}`} className="hover:underline font-medium text-slate-900">
                        {estimate.project.customer.name}
                      </Link>
                      {estimate.project.customer.phone && (
                        <p className="text-xs text-slate-500 mt-0.5">{estimate.project.customer.phone}</p>
                      )}
                    </td>
                    <td className="p-4 text-slate-600 text-sm">{estimate.estimateNumber}</td>
                    <td className="p-4 text-slate-600 text-sm">{formatDate(estimate.createdAt)}</td>
                    <td className="p-4 text-right font-semibold text-slate-900">{formatCurrency(estimate.totalAmount)}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTIMATE_STATUS_COLORS[estimate.status]}`}>
                        {ESTIMATE_STATUS_LABELS[estimate.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
