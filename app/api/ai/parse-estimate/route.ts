import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseEstimateInput } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { input, services = [], existingData, clarificationAnswers } = body;

    if (!input && !clarificationAnswers) {
      return NextResponse.json({ error: "Input required" }, { status: 400 });
    }

    const textInput = clarificationAnswers
      ? `Clarification answers: ${JSON.stringify(clarificationAnswers)}`
      : input;

    const result = await parseEstimateInput(textInput, services, existingData);
    return NextResponse.json(result);
  } catch (error) {
    console.error("AI parse error:", error);
    return NextResponse.json({ error: "AI analysis failed" }, { status: 500 });
  }
}
