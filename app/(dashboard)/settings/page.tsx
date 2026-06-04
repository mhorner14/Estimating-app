import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CompanySettings } from "@/components/settings/company-settings";

export default async function SettingsPage() {
  const session = await auth();
  const companyId = (session?.user as any)?.companyId;

  const company = await prisma.company.findUnique({ where: { id: companyId } });

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Company Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Configure your company info, proposal branding, and payment defaults</p>
      </div>
      <CompanySettings company={company as any} />
    </div>
  );
}
