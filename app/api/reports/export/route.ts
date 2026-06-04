import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as any).companyId;
  const format = req.nextUrl.searchParams.get("format") || "csv";

  const estimates = await prisma.estimate.findMany({
    where: {
      companyId,
      status: { in: ["ACCEPTED", "DEPOSIT_PAID", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "BALANCE_DUE", "PAID_IN_FULL"] },
    },
    include: {
      project: { include: { customer: true } },
      payments: { where: { status: "PAID" } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (format === "quickbooks") {
    // QuickBooks IIF format
    const lines = [
      "!TRNS\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO",
      "!SPL\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO",
      "!ENDTRNS",
    ];
    for (const e of estimates) {
      const date = new Date(e.createdAt).toLocaleDateString("en-US");
      const amount = Number(e.totalAmount).toFixed(2);
      lines.push(`TRNS\tINVOICE\t${date}\tAccounts Receivable\t${e.project.customer.name}\t${amount}\t${e.estimateNumber}`);
      lines.push(`SPL\tINVOICE\t${date}\tSales\t${e.project.customer.name}\t-${amount}\t${e.estimateNumber}`);
      lines.push("ENDTRNS");
    }
    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/plain",
        "Content-Disposition": `attachment; filename="proestimate-quickbooks-${new Date().toISOString().split("T")[0]}.iif"`,
      },
    });
  }

  // Default: CSV export compatible with Xero/Excel
  const headers = [
    "Invoice Number",
    "Customer",
    "Phone",
    "Email",
    "Address",
    "Date",
    "Status",
    "Subtotal",
    "Tax",
    "Total",
    "Deposit",
    "Balance Due",
    "Payments Received",
    "Estimated Cost",
    "Estimated Margin %",
    "Actual Cost",
    "Actual Margin %",
  ];

  const rows = estimates.map((e) => {
    const customer = e.project.customer;
    const totalPaid = e.payments.reduce((s, p) => s + Number(p.amount), 0);
    const actualCost = Number(e.actualTotalCost) || Number(e.actualMaterialCost || 0) + Number(e.actualLaborCost || 0);
    const actualMargin = actualCost > 0 ? (((Number(e.totalAmount) - actualCost) / Number(e.totalAmount)) * 100).toFixed(1) : "";
    return [
      e.estimateNumber,
      customer.name,
      customer.phone || "",
      customer.email || "",
      [customer.projectAddress, customer.city, customer.state].filter(Boolean).join(", "),
      new Date(e.createdAt).toLocaleDateString("en-US"),
      e.status,
      Number(e.subtotal).toFixed(2),
      Number(e.taxAmount).toFixed(2),
      Number(e.totalAmount).toFixed(2),
      Number(e.depositAmount).toFixed(2),
      Number(e.balanceDue).toFixed(2),
      totalPaid.toFixed(2),
      Number(e.estimatedCost).toFixed(2),
      Number(e.estimatedMargin).toFixed(1),
      actualCost ? actualCost.toFixed(2) : "",
      actualMargin,
    ];
  });

  const csv = [headers, ...rows]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="proestimate-export-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
