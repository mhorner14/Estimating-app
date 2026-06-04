import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PlusCircle, Phone, Mail, MapPin } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function CustomersPage() {
  const session = await auth();
  const companyId = (session?.user as any)?.companyId;

  const customers = await prisma.customer.findMany({
    where: { companyId },
    include: { _count: { select: { projects: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <p className="text-slate-500 text-sm mt-1">{customers.length} customers</p>
        </div>
        <Button asChild>
          <Link href="/customers/new">
            <PlusCircle className="w-4 h-4 mr-2" /> Add Customer
          </Link>
        </Button>
      </div>

      {customers.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <p className="text-lg font-medium">No customers yet</p>
          <p className="text-sm mt-1 mb-4">Customers are created when you make an estimate</p>
          <Button asChild><Link href="/estimates/new">Create Estimate</Link></Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((customer) => (
            <Card key={customer.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <Link href={`/customers/${customer.id}`} className="font-semibold text-slate-900 hover:text-blue-600 hover:underline">
                      {customer.name}
                    </Link>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {customer._count.projects} project{customer._count.projects !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5 text-sm text-slate-600">
                  {customer.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {customer.phone}
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {customer.email}
                    </div>
                  )}
                  {customer.projectAddress && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {customer.projectAddress}
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-3">Added {formatDate(customer.createdAt)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
