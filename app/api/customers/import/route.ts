import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = (session.user as any).companyId;
  if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

  const { csv } = await req.json();
  if (!csv || typeof csv !== "string") return NextResponse.json({ error: "No CSV provided" }, { status: 400 });

  const lines = csv.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return NextResponse.json({ error: "CSV must have a header row and at least one data row" }, { status: 400 });

  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));

  const col = (row: string[], name: string) => {
    const idx = headers.indexOf(name);
    return idx >= 0 ? row[idx] || "" : "";
  };

  const results = { created: 0, skipped: 0, errors: [] as string[] };

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    const name = col(row, "name") || col(row, "customer_name") || col(row, "full_name");
    if (!name) { results.skipped++; continue; }

    const email = col(row, "email") || col(row, "email_address");
    const phone = col(row, "phone") || col(row, "phone_number") || col(row, "mobile");
    const address = col(row, "address") || col(row, "project_address") || col(row, "street");
    const city = col(row, "city");
    const state = col(row, "state");
    const zip = col(row, "zip") || col(row, "postal_code") || col(row, "zip_code");
    const leadSource = col(row, "lead_source") || col(row, "source");
    const notes = col(row, "notes") || col(row, "note");

    try {
      await prisma.customer.create({
        data: {
          companyId,
          name,
          email: email || null,
          phone: phone || null,
          projectAddress: address || null,
          city: city || null,
          state: state || null,
          zip: zip || null,
          leadSource: leadSource || null,
          notes: notes || null,
        },
      });
      results.created++;
    } catch (e: any) {
      results.errors.push(`Row ${i + 1}: ${e.message}`);
    }
  }

  return NextResponse.json(results);
}
