import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CompanySettings } from "@/components/settings/company-settings";
import { WarrantyRulesManager } from "@/components/settings/warranty-rules-manager";
import { EmailTemplatesSettings } from "@/components/settings/email-templates-settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function SettingsPage() {
  const session = await auth();
  const companyId = (session?.user as any)?.companyId;

  const [company, warrantyRules] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId } }),
    prisma.warrantyRule.findMany({ where: { companyId }, orderBy: { sortOrder: "asc" } }),
  ]);

  const serializedRules = warrantyRules.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Configure your company info, proposal branding, and warranty rules</p>
      </div>
      <Tabs defaultValue="company">
        <TabsList className="mb-6">
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="warranty">Warranty Rules</TabsTrigger>
          <TabsTrigger value="emails">Email Templates</TabsTrigger>
        </TabsList>
        <TabsContent value="company">
          <CompanySettings company={company as any} />
        </TabsContent>
        <TabsContent value="warranty">
          <WarrantyRulesManager rules={serializedRules} />
        </TabsContent>
        <TabsContent value="emails">
          <EmailTemplatesSettings company={company as any} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
