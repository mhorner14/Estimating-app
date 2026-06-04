import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-05-27.dahlia",
  typescript: true,
});

export async function createPaymentLink(
  amount: number,
  description: string,
  estimateId: string,
  paymentType: "DEPOSIT" | "BALANCE" | "FULL",
  customerEmail?: string
): Promise<{ url: string; sessionId: string }> {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: description,
            metadata: {
              estimateId,
              paymentType,
            },
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    customer_email: customerEmail,
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/proposal/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/proposal/payment-cancelled`,
    metadata: {
      estimateId,
      paymentType,
    },
  });

  return {
    url: session.url!,
    sessionId: session.id,
  };
}
