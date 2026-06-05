import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { JobsView } from "@/components/jobs/jobs-view";

export default async function JobsPage() {
  const session = await auth();
  const companyId = (session?.user as any)?.companyId;

  const activeJobs = await prisma.estimate.findMany({
    where: {
      companyId,
      status: { in: ["SCHEDULED", "IN_PROGRESS", "DEPOSIT_PAID"] },
    },
    include: {
      project: { include: { customer: true } },
      photos: { take: 1 },
    },
    orderBy: [
      { scheduledDate: "asc" },
      { updatedAt: "desc" },
    ],
  });

  const serialized = activeJobs.map((e) => ({
    id: e.id,
    estimateNumber: e.estimateNumber,
    status: e.status,
    totalAmount: Number(e.totalAmount),
    depositAmount: Number(e.depositAmount),
    balanceDue: Number(e.balanceDue),
    squareFootage: e.squareFootage,
    colorSelection: e.colorSelection,
    scheduledDate: e.scheduledDate?.toISOString() ?? null,
    internalNotes: e.internalNotes,
    crewNotes: e.crewNotes,
    customer: {
      name: e.project.customer.name,
      phone: e.project.customer.phone,
      email: e.project.customer.email,
    },
    address: e.project.address || e.project.customer.projectAddress || "",
    city: e.project.city || e.project.customer.city || "",
    state: e.project.state || e.project.customer.state || "",
    photoUrl: e.photos[0]?.url ?? null,
  }));

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Active Jobs</h1>
        <p className="text-slate-500 text-sm mt-1">{serialized.length} job{serialized.length !== 1 ? "s" : ""} scheduled or in progress</p>
      </div>
      <JobsView jobs={serialized} />
    </div>
  );
}
