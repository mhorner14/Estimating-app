import { auth } from "@/lib/auth";
import { ReportsDashboard } from "@/components/reports/reports-dashboard";

export default async function ReportsPage() {
  const session = await auth();
  const companyId = (session?.user as any)?.companyId;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
        <p className="text-slate-500 text-sm mt-1">Track revenue, close rates, lead sources, and job performance</p>
      </div>
      <ReportsDashboard />
    </div>
  );
}
