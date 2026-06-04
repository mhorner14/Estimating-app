import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json([], { status: 401 });

  const companyId = (session.user as any).companyId;
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json([]);

  const [customers, estimates] = await Promise.all([
    prisma.customer.findMany({
      where: {
        companyId,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
          { projectAddress: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 5,
      select: { id: true, name: true, phone: true, email: true },
    }),
    prisma.estimate.findMany({
      where: {
        companyId,
        OR: [
          { estimateNumber: { contains: q, mode: "insensitive" } },
          { project: { customer: { name: { contains: q, mode: "insensitive" } } } },
        ],
      },
      take: 5,
      include: { project: { include: { customer: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const results = [
    ...customers.map((c) => ({
      type: "customer" as const,
      id: c.id,
      title: c.name,
      subtitle: [c.phone, c.email].filter(Boolean).join(" · ") || "Customer",
      href: `/customers/${c.id}`,
    })),
    ...estimates.map((e) => ({
      type: "estimate" as const,
      id: e.id,
      title: e.project.customer.name,
      subtitle: `${e.estimateNumber} · $${Number(e.totalAmount).toFixed(0)} · ${e.status}`,
      href: `/estimates/${e.id}`,
    })),
  ];

  return NextResponse.json(results);
}
