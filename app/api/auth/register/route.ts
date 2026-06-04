import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  companyName: z.string().min(2),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const company = await prisma.company.create({
      data: {
        name: data.companyName,
        depositPercentage: 50,
        defaultPaymentTerms: "50% deposit due upon acceptance. 50% balance due upon completion.",
        defaultTerms: "All work is subject to our standard terms and conditions. Customer is responsible for clearing the work area prior to installation. Pricing is valid for 30 days from proposal date.",
      },
    });

    await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: "OWNER",
        companyId: company.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
