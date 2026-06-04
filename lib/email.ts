import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "proposals@proestimate.app";

export async function sendProposalEmail({
  to,
  customerName,
  companyName,
  estimateNumber,
  totalAmount,
  proposalUrl,
  depositAmount,
  customSubject,
  customBody,
}: {
  to: string;
  customerName: string;
  companyName: string;
  estimateNumber: string;
  totalAmount: number;
  proposalUrl: string;
  depositAmount: number;
  customSubject?: string | null;
  customBody?: string | null;
}) {
  const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

  function applyVars(template: string) {
    return template
      .replace(/\{\{companyName\}\}/g, companyName)
      .replace(/\{\{customerName\}\}/g, customerName)
      .replace(/\{\{estimateNumber\}\}/g, estimateNumber)
      .replace(/\{\{total\}\}/g, formatter.format(totalAmount))
      .replace(/\{\{deposit\}\}/g, formatter.format(depositAmount))
      .replace(/\{\{proposalLink\}\}/g, proposalUrl);
  }

  const subject = customSubject
    ? applyVars(customSubject)
    : `Your Proposal from ${companyName} — ${estimateNumber}`;

  const customHtml = customBody
    ? `<!DOCTYPE html><html><body style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
  <div style="background: #0f172a; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 20px;">${companyName}</h1>
  </div>
  <div style="background: white; border: 1px solid #e2e8f0; border-top: none; padding: 32px; border-radius: 0 0 12px 12px;">
    ${applyVars(customBody).split("\n\n").map((p) => `<p style="color:#475569;line-height:1.6;margin:0 0 16px">${p.replace(/\n/g,"<br>")}</p>`).join("")}
    <div style="text-align:center;margin:32px 0"><a href="${proposalUrl}" style="background:#2563eb;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600">Review & Sign Proposal</a></div>
  </div></body></html>`
    : null;

  const html = customHtml || `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
  <div style="background: #0f172a; padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">${companyName}</h1>
    <p style="color: #94a3b8; margin: 8px 0 0;">Project Proposal</p>
  </div>

  <div style="background: white; border: 1px solid #e2e8f0; border-top: none; padding: 32px; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px; margin: 0 0 16px;">Hi ${customerName},</p>

    <p style="color: #475569; line-height: 1.6; margin: 0 0 24px;">
      Thank you for the opportunity to quote your project. Your proposal is ready for review.
      Please take a moment to look it over and sign when you're ready to move forward.
    </p>

    <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 0 0 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="color: #64748b; padding: 4px 0;">Proposal #</td>
          <td style="text-align: right; font-weight: 600;">${estimateNumber}</td>
        </tr>
        <tr>
          <td style="color: #64748b; padding: 4px 0;">Total Investment</td>
          <td style="text-align: right; font-weight: 600;">${formatter.format(totalAmount)}</td>
        </tr>
        <tr>
          <td style="color: #64748b; padding: 4px 0;">Deposit Required</td>
          <td style="text-align: right; font-weight: 600; color: #3b82f6;">${formatter.format(depositAmount)}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${proposalUrl}"
         style="background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
        Review & Sign Proposal
      </a>
    </div>

    <p style="color: #94a3b8; font-size: 13px; text-align: center; margin: 0;">
      This proposal link is unique to you. You can review, sign, and pay the deposit all in one place.
    </p>
  </div>

  <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 20px 0 0;">
    ${companyName} · Questions? Reply to this email.
  </p>
</body>
</html>`;

  try {
    const { data, error } = await resend.emails.send({
      from: `${companyName} <${FROM_EMAIL}>`,
      to,
      subject,
      html,
    });

    await prisma.emailLog.create({
      data: {
        to,
        subject,
        template: "proposal_sent",
        status: error ? "failed" : "sent",
        messageId: data?.id,
      },
    });

    return { success: !error, error };
  } catch (err) {
    console.error("Email send error:", err);
    return { success: false, error: err };
  }
}

export async function sendSignedConfirmationEmail({
  to,
  customerName,
  companyName,
  estimateNumber,
  proposalUrl,
}: {
  to: string;
  customerName: string;
  companyName: string;
  estimateNumber: string;
  proposalUrl: string;
}) {
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
  <div style="background: #0f172a; padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">${companyName}</h1>
  </div>
  <div style="background: white; border: 1px solid #e2e8f0; border-top: none; padding: 32px; border-radius: 0 0 12px 12px;">
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="width: 64px; height: 64px; background: #dcfce7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
        <span style="font-size: 32px;">✓</span>
      </div>
    </div>
    <h2 style="text-align: center; color: #16a34a;">Proposal Accepted!</h2>
    <p>Hi ${customerName},</p>
    <p style="color: #475569; line-height: 1.6;">
      Thank you for accepting the proposal <strong>${estimateNumber}</strong>. Your signature has been recorded and we'll be in touch shortly to schedule your project.
    </p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${proposalUrl}" style="color: #2563eb; text-decoration: none;">View your signed proposal →</a>
    </div>
  </div>
</body>
</html>`;

  try {
    const { data, error } = await resend.emails.send({
      from: `${companyName} <${FROM_EMAIL}>`,
      to,
      subject: `✓ Proposal Accepted — ${estimateNumber}`,
      html,
    });

    await prisma.emailLog.create({
      data: {
        to,
        subject: `✓ Proposal Accepted — ${estimateNumber}`,
        template: "proposal_accepted",
        status: error ? "failed" : "sent",
        messageId: data?.id,
      },
    });

    return { success: !error };
  } catch {
    return { success: false };
  }
}
