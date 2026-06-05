import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Price IDs — set in Stripe dashboard, pulled from env
const PRICE_IDS: Record<string, string | undefined> = {
  STARTER: process.env.STRIPE_PRICE_STARTER,
  PRO: process.env.STRIPE_PRICE_PRO,
  ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE,
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = (session.user as any).companyId;
  const userId = (session.user as any).id;

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 400 });
  }

  const { plan } = await req.json();
  const priceId = PRICE_IDS[plan];

  if (!priceId) {
    return NextResponse.json({ error: `No price configured for plan ${plan}. Set STRIPE_PRICE_${plan} env var.` }, { status: 400 });
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true, email: true, stripeCustomerId: true },
  });

  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const stripe = (await import("stripe")).default;
  const client = new stripe(process.env.STRIPE_SECRET_KEY);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.proestimate.io";

  // Create or reuse Stripe customer
  let customerId = company.stripeCustomerId;
  if (!customerId) {
    const customer = await client.customers.create({
      name: company.name,
      email: company.email || undefined,
      metadata: { companyId, userId },
    });
    customerId = customer.id;
    await prisma.company.update({ where: { id: companyId }, data: { stripeCustomerId: customerId } });
  }

  const checkoutSession = await client.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/billing?upgraded=true`,
    cancel_url: `${appUrl}/billing`,
    metadata: { companyId, plan },
    subscription_data: {
      metadata: { companyId, plan },
    },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
