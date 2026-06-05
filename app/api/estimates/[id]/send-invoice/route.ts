import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const companyId = (session?.user as any)?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 400 });
  }

  const { id } = await params;
  const estimate = await prisma.estimate.findFirst({
    where: { id, companyId },
    include: {
      project: { include: { customer: true } },
      lineItems: true,
      company: { select: { name: true } },
    },
  });
  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const customerEmail = estimate.project.customer.email;
  if (!customerEmail) return NextResponse.json({ error: "Customer has no email address" }, { status: 400 });

  const stripe = (await import("stripe")).default;
  const client = new stripe(process.env.STRIPE_SECRET_KEY!);

  // Find or create Stripe customer by email
  const existingCustomers = await client.customers.list({ email: customerEmail, limit: 1 });
  let stripeCustomerId: string;
  if (existingCustomers.data.length > 0) {
    stripeCustomerId = existingCustomers.data[0].id;
  } else {
    const sc = await client.customers.create({
      email: customerEmail,
      name: estimate.project.customer.name,
      phone: estimate.project.customer.phone || undefined,
    });
    stripeCustomerId = sc.id;
  }

  // Create invoice
  const invoice = await client.invoices.create({
    customer: stripeCustomerId,
    collection_method: "send_invoice",
    days_until_due: 14,
    description: `${(estimate.company as any).name} — ${estimate.estimateNumber}`,
    metadata: { estimateId: id, estimateNumber: estimate.estimateNumber },
  });

  // Add line items
  for (const li of estimate.lineItems) {
    await client.invoiceItems.create({
      customer: stripeCustomerId,
      invoice: invoice.id,
      description: li.description,
      quantity: 1,
      amount: Math.round(Number(li.totalPrice) * 100),
      currency: "usd",
    });
  }

  // Finalize and send
  await client.invoices.finalizeInvoice(invoice.id);
  await client.invoices.sendInvoice(invoice.id);

  await prisma.activityLog.create({
    data: {
      entityType: "estimate",
      entityId: id,
      action: "stripe_invoice_sent",
      metadata: { invoiceId: invoice.id, customerEmail, sentAt: new Date().toISOString() },
    },
  });

  return NextResponse.json({ ok: true, invoiceId: invoice.id });
}
