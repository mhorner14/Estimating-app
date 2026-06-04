import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  condition: z.string().min(1),
  warrantyText: z.string().min(1),
  isDefault: z.boolean().optional().default(false),
  sortOrder: z.number().optional().default(0),
});

export async function GET() {
  const session = await auth();
  const companyId = (session?.user as any)?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rules = await prisma.warrantyRule.findMany({
    where: { companyId },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(rules);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const companyId = (session?.user as any)?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const rule = await prisma.warrantyRule.create({
    data: { ...parsed.data, companyId },
  });
  return NextResponse.json(rule, { status: 201 });
}
