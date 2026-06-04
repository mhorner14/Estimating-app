import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/nav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex h-screen bg-slate-50">
      <DashboardNav user={session.user} />
      <main className="flex-1 overflow-y-auto pt-12 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
