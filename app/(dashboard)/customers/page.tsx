import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { CustomersList } from "@/components/customers/customers-list";

export default async function CustomersPage() {
  const session = await auth();
  const companyId = (session?.user as any)?.companyId;

  const customers = await prisma.customer.findMany({
    where: { companyId },
    include: { _count: { select: { projects: true } } },
    orderBy: { name: "asc" },
  });

  const serialized = customers.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
  }));

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
        <CustomersList customers={serialized} />
      )}
    </div>
  );
}
