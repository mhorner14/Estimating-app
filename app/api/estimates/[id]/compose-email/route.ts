import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const estimate = await prisma.estimate.findFirst({
    where: { id, companyId },
    include: {
      project: { include: { customer: true } },
      company: true,
      lineItems: { include: { service: true } },
      proposal: true,
    },
  });

  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { purpose } = body; // 'follow_up' | 'send_proposal' | 'check_in' | 'custom'
  const customContext = body.customContext || "";

  const customer = estimate.project.customer;
  const company = estimate.company;
  const services = estimate.lineItems.map((li) => li.service?.name || li.description).join(", ");

  const purposeMap: Record<string, string> = {
    follow_up: "Write a warm, professional follow-up email to check in on this proposal. The customer has had it for a few days.",
    send_proposal: "Write an email to introduce and send this proposal. Make it personal and highlight the value.",
    check_in: "Write a check-in email after the job was completed, asking how things turned out.",
    custom: customContext || "Write a professional email about this estimate.",
  };
  const purposeContext = purposeMap[purpose] || customContext;

  const proposalUrl = estimate.proposal?.publicToken
    ? `${process.env.NEXT_PUBLIC_APP_URL}/proposal/${estimate.proposal.publicToken}`
    : null;

  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 600,
    messages: [{
      role: "user",
      content: `You are helping a concrete coatings contractor write a personalized email.

Context:
- Company: ${company.name}
- Customer: ${customer.name}
- Services: ${services || "concrete coating"}
- Total: $${Number(estimate.totalAmount).toLocaleString()}
- Square footage: ${estimate.squareFootage ? `${estimate.squareFootage} sqft` : "unknown"}
- Customer phone: ${customer.phone || "not provided"}
${proposalUrl ? `- Proposal URL: ${proposalUrl}` : ""}

Task: ${purposeContext}

Write a concise, warm, professional email. Include a subject line on the first line starting with "Subject: ".
Keep it under 150 words. Be conversational, not corporate. Use the customer's first name.
Do not include a signature — it will be added automatically.`,
    }],
  });

  const text = (msg.content[0] as any).text as string;
  const lines = text.split("\n");
  const subjectLine = lines.find((l) => l.startsWith("Subject:"));
  const subject = subjectLine ? subjectLine.replace("Subject:", "").trim() : `Following up — ${company.name}`;
  const body_text = lines.filter((l) => !l.startsWith("Subject:")).join("\n").trim();

  return NextResponse.json({ subject, body: body_text });
}
