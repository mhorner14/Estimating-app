import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ScheduleView } from "@/components/schedule/schedule-view";

export default async function SchedulePage() {
  const session = await auth();
  const companyId = (session?.user as any)?.companyId;

  const scheduledEstimates = await prisma.estimate.findMany({
    where: {
      companyId,
      scheduledDate: { not: null },
      status: { notIn: ["LOST", "PAID_IN_FULL"] },
    },
    include: {
      project: { include: { customer: true } },
    },
    orderBy: { scheduledDate: "asc" },
  });

  const serialized = scheduledEstimates.map((e) => ({
    id: e.id,
    estimateNumber: e.estimateNumber,
    status: e.status,
    scheduledDate: e.scheduledDate!.toISOString(),
    totalAmount: Number(e.totalAmount),
    customerName: e.project.customer.name,
    customerPhone: e.project.customer.phone,
    address: e.project.customer.projectAddress,
    city: e.project.customer.city,
    state: e.project.customer.state,
  }));

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Schedule</h1>
        <p className="text-slate-500 text-sm mt-1">Upcoming jobs and scheduled work</p>
      </div>
      <ScheduleView jobs={serialized} />
    </div>
  );
}
