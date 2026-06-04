import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency, ESTIMATE_STATUS_LABELS, ESTIMATE_STATUS_COLORS } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  FileText,
  DollarSign,
  TrendingUp,
  Clock,
  PlusCircle,
  ArrowRight,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await auth();
  const companyId = (session?.user as any)?.companyId;

  const [estimates, company] = await Promise.all([
    prisma.estimate.findMany({
      where: { companyId },
      include: {
        project: { include: { customer: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.company.findUnique({ where: { id: companyId } }),
  ]);

  const totalRevenue = estimates
    .filter((e) => ["ACCEPTED", "DEPOSIT_PAID", "IN_PROGRESS", "COMPLETED", "PAID_IN_FULL"].includes(e.status))
    .reduce((sum, e) => sum + e.totalAmount, 0);

  const pendingRevenue = estimates
    .filter((e) => ["SENT", "VIEWED", "READY_FOR_REVIEW"].includes(e.status))
    .reduce((sum, e) => sum + e.totalAmount, 0);

  const acceptedCount = estimates.filter((e) =>
    ["ACCEPTED", "DEPOSIT_PAID", "IN_PROGRESS", "COMPLETED", "PAID_IN_FULL"].includes(e.status)
  ).length;

  const sentCount = estimates.filter((e) => ["SENT", "VIEWED"].includes(e.status)).length;
  const closeRate = sentCount > 0 ? Math.round((acceptedCount / (sentCount + acceptedCount)) * 100) : 0;

  const needsAttention = estimates.filter((e) =>
    ["NEEDS_CLARIFICATION", "DRAFT", "BALANCE_DUE"].includes(e.status)
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back{session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-slate-500 mt-1">{company?.name || "Your Company"} — Dashboard Overview</p>
        </div>
        <Button asChild>
          <Link href="/estimates/new">
            <PlusCircle className="w-4 h-4 mr-2" />
            New Estimate
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Estimates</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{estimates.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Accepted Revenue</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{formatCurrency(totalRevenue)}</p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Pending Revenue</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{formatCurrency(pendingRevenue)}</p>
              </div>
              <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Close Rate</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{closeRate}%</p>
              </div>
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Estimates</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/estimates">
                  View all <ArrowRight className="ml-1 w-4 h-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {estimates.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="font-medium">No estimates yet</p>
                  <p className="text-sm mt-1">Create your first estimate to get started</p>
                  <Button className="mt-4" asChild>
                    <Link href="/estimates/new">Create Estimate</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {estimates.slice(0, 8).map((estimate) => (
                    <Link
                      key={estimate.id}
                      href={`/estimates/${estimate.id}`}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-900 text-sm truncate">
                            {estimate.project.customer.name}
                          </p>
                          <span className="text-slate-400 text-xs">·</span>
                          <span className="text-slate-500 text-xs">{estimate.estimateNumber}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {formatDate(estimate.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <span className="font-semibold text-slate-900 text-sm">
                          {formatCurrency(estimate.totalAmount)}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTIMATE_STATUS_COLORS[estimate.status]}`}>
                          {ESTIMATE_STATUS_LABELS[estimate.status]}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                Needs Attention
              </CardTitle>
            </CardHeader>
            <CardContent>
              {needsAttention.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-400" />
                  <p className="text-sm">All caught up!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {needsAttention.slice(0, 5).map((estimate) => (
                    <Link
                      key={estimate.id}
                      href={`/estimates/${estimate.id}`}
                      className="block p-3 rounded-lg bg-orange-50 border border-orange-100 hover:bg-orange-100 transition-colors"
                    >
                      <p className="font-medium text-sm text-slate-900 truncate">
                        {estimate.project.customer.name}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{estimate.estimateNumber}</p>
                      <span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ESTIMATE_STATUS_COLORS[estimate.status]}`}>
                        {ESTIMATE_STATUS_LABELS[estimate.status]}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
