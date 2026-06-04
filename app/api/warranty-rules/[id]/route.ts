import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).optional(),
  condition: z.string().min(1).optional(),
  warrantyText: z.string().min(1).optional(),
  isDefault: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const companyId = (session?.user as any)?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rule = await prisma.warrantyRule.findUnique({ where: { id } });
  if (!rule || rule.companyId !== companyId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const updated = await prisma.warrantyRule.update({ where: { id }, data: parsed.data });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const companyId = (session?.user as any)?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rule = await prisma.warrantyRule.findUnique({ where: { id } });
  if (!rule || rule.companyId !== companyId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.warrantyRule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
