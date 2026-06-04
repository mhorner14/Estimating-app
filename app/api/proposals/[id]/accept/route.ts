import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { sendSignedConfirmationEmail } from "@/lib/email";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { signerName, signatureData, termsAccepted } = body;

  if (!signerName || !signatureData) {
    return NextResponse.json({ error: "Signature required" }, { status: 400 });
  }

  const proposal = await prisma.proposal.findUnique({
    where: { id },
    include: {
      estimate: {
        include: {
          signature: true,
          project: { include: { customer: true } },
          company: true,
        },
      },
    },
  });

  if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (proposal.estimate.signature) {
    return NextResponse.json({ error: "Already signed" }, { status: 400 });
  }

  const headersList = await headers();
  const ipAddress =
    headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown";
  const userAgent = headersList.get("user-agent") || "";

  await prisma.$transaction([
    prisma.signature.create({
      data: {
        estimateId: proposal.estimateId,
        signerName,
        signatureData,
        ipAddress,
        userAgent,
        estimateVersion: proposal.estimate.version,
        termsAccepted: Boolean(termsAccepted),
      },
    }),
    prisma.estimate.update({
      where: { id: proposal.estimateId },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    }),
    prisma.proposal.update({
      where: { id },
      data: { status: "ACCEPTED" },
    }),
  ]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://proestimate.app";
  const proposalUrl = `${appUrl}/proposal/${proposal.publicToken}`;
  const estimateUrl = `${appUrl}/estimates/${proposal.estimateId}`;
  const customer = proposal.estimate.project.customer;
  const company = proposal.estimate.company;
  const estimateNumber = proposal.estimate.estimateNumber;

  // Send confirmation to customer
  if (customer.email && process.env.RESEND_API_KEY) {
    await sendSignedConfirmationEmail({
      to: customer.email,
      customerName: customer.name,
      companyName: company.name,
      estimateNumber,
      proposalUrl,
    });
  }

  // Notify contractor that proposal was signed
  if (company.email && process.env.RESEND_API_KEY) {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.RESEND_FROM_EMAIL || "proposals@proestimate.app";
    const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

    await resend.emails.send({
      from: fromEmail,
      to: company.email,
      subject: `🎉 ${customer.name} signed your proposal — ${estimateNumber}`,
      html: `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1e293b;">
  <div style="background:#0f172a;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="color:white;margin:0;font-size:20px;">${company.name}</h1>
  </div>
  <div style="background:white;border:1px solid #e2e8f0;border-top:none;padding:32px;border-radius:0 0 12px 12px;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:64px;height:64px;background:#dcfce7;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:32px;">🎉</div>
    </div>
    <h2 style="text-align:center;color:#16a34a;margin:0 0 16px;">Proposal Accepted!</h2>
    <p style="color:#475569;line-height:1.6;">
      <strong>${customer.name}</strong> has signed and accepted proposal <strong>${estimateNumber}</strong> for <strong>${formatter.format(Number(proposal.estimate.totalAmount))}</strong>.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${estimateUrl}" style="background:#2563eb;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">View Estimate</a>
    </div>
    <p style="color:#94a3b8;font-size:13px;text-align:center;">Signed by: ${signerName}</p>
  </div>
</body></html>`,
    }).catch(() => {}); // Don't fail if notification email fails
  }

  return NextResponse.json({ success: true });
}
