import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency, ESTIMATE_STATUS_LABELS, ESTIMATE_STATUS_COLORS } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { RevenueGoal } from "@/components/dashboard/revenue-goal";
import { PipelineFunnel } from "@/components/dashboard/pipeline-funnel";
import {
  FileText,
  DollarSign,
  TrendingUp,
  Clock,
  PlusCircle,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Users,
  Activity,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

const WON_STATUSES = ["ACCEPTED", "DEPOSIT_PAID", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "BALANCE_DUE", "PAID_IN_FULL"];
const PENDING_STATUSES = ["SENT", "VIEWED", "READY_FOR_REVIEW"];
const ATTENTION_STATUSES = ["NEEDS_CLARIFICATION", "DRAFT", "BALANCE_DUE"];

export default async function DashboardPage() {
  const session = await auth();
  const companyId = (session?.user as any)?.companyId;

  const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

  const [allEstimates, recentEstimates, company, customerCount, serviceCount, recentActivity, todaysJobs] = await Promise.all([
    prisma.estimate.findMany({
      where: { companyId },
      select: { status: true, totalAmount: true, createdAt: true },
    }),
    prisma.estimate.findMany({
      where: { companyId },
      include: { project: { include: { customer: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.company.findUnique({ where: { id: companyId } }),
    prisma.customer.count({ where: { companyId } }),
    prisma.service.count({ where: { companyId } }),
    prisma.activityLog.findMany({
      where: { entityType: "estimate", user: { companyId } },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.estimate.findMany({
      where: {
        companyId,
        scheduledDate: { gte: todayStart, lte: todayEnd },
        status: { notIn: ["LOST", "PAID_IN_FULL", "DRAFT"] },
      },
      include: { project: { include: { customer: true } } },
      orderBy: { scheduledDate: "asc" },
    }),
  ]);

  const monthRevenue = allEstimates
    .filter((e) => WON_STATUSES.includes(e.status) && e.createdAt >= thisMonthStart)
    .reduce((sum, e) => sum + Number(e.totalAmount), 0);

  const wonRevenue = allEstimates
    .filter((e) => WON_STATUSES.includes(e.status))
    .reduce((sum, e) => sum + Number(e.totalAmount), 0);

  const pendingRevenue = allEstimates
    .filter((e) => PENDING_STATUSES.includes(e.status))
    .reduce((sum, e) => sum + Number(e.totalAmount), 0);

  const wonCount = allEstimates.filter((e) => WON_STATUSES.includes(e.status)).length;
  const sentCount = allEstimates.filter((e) => [...PENDING_STATUSES, ...WON_STATUSES, "LOST"].includes(e.status)).length;
  const closeRate = sentCount > 0 ? Math.round((wonCount / sentCount) * 100) : 0;

  const needsAttention = recentEstimates.filter((e) => ATTENTION_STATUSES.includes(e.status));

  // Pipeline breakdown: count + value by status group
  const pipeline = [
    {
      label: "Draft / New",
      statuses: ["DRAFT", "NEEDS_CLARIFICATION", "READY_FOR_REVIEW"],
      color: "bg-slate-400",
    },
    {
      label: "Sent / Out",
      statuses: ["SENT", "VIEWED"],
      color: "bg-blue-500",
    },
    {
      label: "Won",
      statuses: WON_STATUSES,
      color: "bg-emerald-500",
    },
    {
      label: "Lost",
      statuses: ["LOST"],
      color: "bg-red-400",
    },
  ].map((stage) => ({
    ...stage,
    count: allEstimates.filter((e) => stage.statuses.includes(e.status)).length,
    value: allEstimates
      .filter((e) => stage.statuses.includes(e.status))
      .reduce((sum, e) => sum + Number(e.totalAmount), 0),
  }));

  const maxCount = Math.max(...pipeline.map((s) => s.count), 1);

  const onboardingItems = [
    {
      id: "company",
      label: "Set up your company profile",
      description: "Add your company name, phone, address, and license number",
      href: "/settings",
      completed: !!(company?.phone && company?.address),
    },
    {
      id: "services",
      label: "Add your services & pricing",
      description: "Add the services you offer so the AI can price estimates accurately",
      href: "/services",
      completed: serviceCount > 0,
    },
    {
      id: "estimate",
      label: "Create your first estimate",
      description: "Try the AI intake — describe a job in plain English",
      href: "/estimates/new",
      completed: allEstimates.length > 0,
    },
    {
      id: "proposal",
      label: "Send a proposal to a customer",
      description: "Generate a proposal and email it to a customer for signature",
      href: "/estimates",
      completed: allEstimates.some((e) => ["SENT", "VIEWED", ...WON_STATUSES].includes(e.status)),
    },
  ];

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

      <OnboardingChecklist items={onboardingItems} />

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Total Estimates</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{allEstimates.length}</p>
              </div>
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Won Revenue</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(wonRevenue)}</p>
              </div>
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Pending Revenue</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(pendingRevenue)}</p>
              </div>
              <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Close Rate</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{closeRate}%</p>
                <p className="text-xs text-slate-400 mt-0.5">{customerCount} customers</p>
              </div>
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline bar chart + recent estimates */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Pipeline Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pipeline.map((stage) => (
                <div key={stage.label}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-slate-600 font-medium">{stage.label}</span>
                    <span className="text-slate-500 text-xs">
                      {stage.count} estimate{stage.count !== 1 ? "s" : ""} · {formatCurrency(stage.value)}
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${stage.color} transition-all`}
                      style={{ width: `${(stage.count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {todaysJobs.length > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-blue-900">
                  <Activity className="w-4 h-4 text-blue-600" />
                  Today&apos;s Jobs ({todaysJobs.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {todaysJobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/estimates/${job.id}`}
                    className="block p-3 rounded-lg bg-white border border-blue-100 hover:bg-blue-50 transition-colors"
                  >
                    <p className="font-medium text-sm text-slate-900 truncate">{job.project.customer.name}</p>
                    <p className="text-xs text-slate-500">{job.project.customer.projectAddress || "Address on file"}</p>
                    <span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ESTIMATE_STATUS_COLORS[job.status as keyof typeof ESTIMATE_STATUS_COLORS]}`}>
                      {ESTIMATE_STATUS_LABELS[job.status as keyof typeof ESTIMATE_STATUS_LABELS]}
                    </span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
          <RevenueGoal monthRevenue={monthRevenue} goal={company?.monthlyRevenueGoal ?? null} />
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <PipelineFunnel estimates={allEstimates.map((e) => ({ status: e.status, totalAmount: Number(e.totalAmount) }))} />
            </CardContent>
          </Card>
          <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-orange-500" />
              Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            {needsAttention.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <CheckCircle className="w-10 h-10 mx-auto mb-2 text-emerald-400" />
                <p className="text-sm">All caught up!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {needsAttention.slice(0, 5).map((estimate) => (
                  <Link
                    key={estimate.id}
                    href={`/estimates/${estimate.id}`}
                    className="block p-3 rounded-lg bg-orange-50 border border-orange-100 hover:bg-orange-100 transition-colors"
                  >
                    <p className="font-medium text-sm text-slate-900 truncate">
                      {estimate.project.customer.name}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 font-mono">{estimate.estimateNumber}</p>
                    <span className={`mt-1.5 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ESTIMATE_STATUS_COLORS[estimate.status as keyof typeof ESTIMATE_STATUS_COLORS]}`}>
                      {ESTIMATE_STATUS_LABELS[estimate.status as keyof typeof ESTIMATE_STATUS_LABELS]}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Recent estimates */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold">Recent Estimates</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/estimates">
              View all <ArrowRight className="ml-1 w-4 h-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {recentEstimates.length === 0 ? (
            <div className="text-center py-12 text-slate-500 px-6">
              <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">No estimates yet</p>
              <p className="text-sm mt-1">Create your first estimate to get started</p>
              <Button className="mt-4" asChild>
                <Link href="/estimates/new">Create Estimate</Link>
              </Button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Customer</th>
                  <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Estimate #</th>
                  <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Date</th>
                  <th className="text-right p-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Total</th>
                  <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentEstimates.map((estimate) => (
                  <tr key={estimate.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <Link href={`/estimates/${estimate.id}`} className="hover:underline font-medium text-slate-900 text-sm">
                        {estimate.project.customer.name}
                      </Link>
                    </td>
                    <td className="p-4 text-slate-500 text-sm font-mono">{estimate.estimateNumber}</td>
                    <td className="p-4 text-slate-500 text-sm">{formatDate(estimate.createdAt)}</td>
                    <td className="p-4 text-right font-semibold text-slate-900 text-sm">{formatCurrency(Number(estimate.totalAmount))}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTIMATE_STATUS_COLORS[estimate.status as keyof typeof ESTIMATE_STATUS_COLORS]}`}>
                        {ESTIMATE_STATUS_LABELS[estimate.status as keyof typeof ESTIMATE_STATUS_LABELS]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {recentActivity.length > 0 && (
        <Card className="mt-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-500" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {recentActivity.map((log) => {
                const actionLabels: Record<string, string> = {
                  status_changed: "Status changed",
                  proposal_generated: "Proposal generated",
                  proposal_sent: "Proposal sent",
                  follow_up_sent: "Follow-up sent",
                  balance_request_sent: "Balance request sent",
                  payment_recorded: "Payment recorded",
                };
                const label = actionLabels[log.action] || log.action.replace(/_/g, " ");
                const meta = log.metadata as Record<string, unknown> | null;
                return (
                  <div key={log.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700">
                        <span className="font-medium">{label}</span>
                        {meta?.to ? <span className="text-slate-500"> → {String(meta.to)}</span> : null}
                        {meta?.newStatus ? <span className="text-slate-500"> → {String(meta.newStatus)}</span> : null}
                        {meta?.amount ? <span className="text-slate-500"> (${Number(meta.amount).toFixed(2)})</span> : null}
                      </p>
                      <p className="text-xs text-slate-400">
                        {log.user?.name || "System"} · {new Date(log.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>
                    <Link href={`/estimates/${log.entityId}`} className="text-xs text-blue-500 hover:underline shrink-0">
                      View
                    </Link>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
