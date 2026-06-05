import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ServicesManager } from "@/components/services/services-manager";
import { TemplatesManager } from "@/components/templates/templates-manager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function ServicesPage() {
  const session = await auth();
  const companyId = (session?.user as any)?.companyId;

  const [services, templates] = await Promise.all([
    prisma.service.findMany({
      where: { companyId },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.estimateTemplate.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const servicesSerialized = services.map((s) => ({ id: s.id, name: s.name, basePrice: s.basePrice }));

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Services & Pricing</h1>
        <p className="text-slate-500 text-sm mt-1">
          Manage your service catalog, pricing rules, and estimate templates.
        </p>
      </div>
      <Tabs defaultValue="services">
        <TabsList className="mb-6">
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>
        <TabsContent value="services">
          <ServicesManager services={services} companyId={companyId} />
        </TabsContent>
        <TabsContent value="templates">
          <TemplatesManager services={servicesSerialized} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
