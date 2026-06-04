import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ParsedEstimateData {
  squareFootage?: number;
  linearFootage?: number;
  services?: string[];
  existingCoating?: boolean;
  crackRepairNeeded?: boolean;
  crackCount?: number;
  surfaceCondition?: string;
  moistureConcerns?: boolean;
  colorSelection?: string;
  requestedTimeline?: string;
  location?: string;
  projectType?: "residential" | "commercial";
  stemWalls?: boolean;
  notes?: string;
}

export interface AIEstimateResult {
  parsedData: ParsedEstimateData;
  clarificationQuestions: string[];
  suggestions: string[];
  warnings: string[];
  upsells: string[];
  isComplete: boolean;
}

export interface AIProposalContent {
  proposalTitle: string;
  scopeOfWork: string;
  prepSteps: string;
  productsIncluded: string;
  warrantyText: string;
  exclusions: string;
  customerFacingSummary: string;
}

export async function parseEstimateInput(
  input: string,
  services: Array<{ name: string; category: string; pricingType: string; basePrice: number }>,
  existingData?: Partial<ParsedEstimateData>
): Promise<AIEstimateResult> {
  const systemPrompt = `You are an expert concrete coatings estimator assistant. Your job is to extract structured estimate data from natural language input provided by field estimators.

Available services: ${JSON.stringify(services.map(s => s.name))}

Rules:
- NEVER invent or guess measurements - only extract what is explicitly stated
- Ask clarification questions for any missing required fields
- Be specific and professional
- Separate internal recommendations from customer-facing language
- Flag any profit/warranty concerns

Required fields for a complete estimate:
1. Square footage (or linear footage for stem walls)
2. Service type / coating system
3. Existing coating status
4. Crack/damage assessment
5. Project type (residential/commercial)
6. Color selection (can be TBD)

Return ONLY valid JSON matching this exact structure:
{
  "parsedData": {
    "squareFootage": number | null,
    "linearFootage": number | null,
    "services": string[],
    "existingCoating": boolean | null,
    "crackRepairNeeded": boolean | null,
    "crackCount": number | null,
    "surfaceCondition": string | null,
    "moistureConcerns": boolean | null,
    "colorSelection": string | null,
    "requestedTimeline": string | null,
    "location": string | null,
    "projectType": "residential" | "commercial" | null,
    "stemWalls": boolean | null,
    "notes": string | null
  },
  "clarificationQuestions": string[],
  "suggestions": string[],
  "warnings": string[],
  "upsells": string[],
  "isComplete": boolean
}`;

  const userMessage = existingData
    ? `Previous data: ${JSON.stringify(existingData)}\n\nNew input: ${input}`
    : input;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in response");

  return JSON.parse(jsonMatch[0]) as AIEstimateResult;
}

export async function generateProposalContent(
  estimateData: {
    customerName: string;
    projectAddress: string;
    services: Array<{ name: string; description: string; quantity: number; unit: string; price: number }>;
    squareFootage?: number;
    colorSelection?: string;
    existingCoating?: boolean;
    crackRepairNeeded?: boolean;
    moistureConcerns?: boolean;
    totalAmount: number;
    companyName: string;
    warrantyRules?: string[];
  }
): Promise<AIProposalContent> {
  const systemPrompt = `You are a professional proposal writer for a premium concrete coatings company.
Write clear, confident, trust-building proposal language that reflects premium positioning.
Avoid generic AI-sounding language. Be specific to the job. Use industry terminology correctly.
Do NOT be overly salesy. Let the quality of work speak for itself.

Return ONLY valid JSON:
{
  "proposalTitle": string,
  "scopeOfWork": string,
  "prepSteps": string,
  "productsIncluded": string,
  "warrantyText": string,
  "exclusions": string,
  "customerFacingSummary": string
}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Generate professional proposal content for this job:\n${JSON.stringify(estimateData, null, 2)}`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in response");

  return JSON.parse(jsonMatch[0]) as AIProposalContent;
}

export async function answerClarificationQuestions(
  questions: string[],
  answers: Record<string, string>,
  currentData: ParsedEstimateData
): Promise<AIEstimateResult> {
  const input = `Clarification answers provided:\n${Object.entries(answers)
    .map(([q, a]) => `Q: ${q}\nA: ${a}`)
    .join("\n\n")}`;

  return parseEstimateInput(input, [], currentData);
}
