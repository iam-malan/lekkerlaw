import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function suggestPracticeAreas(input: string) {
  const system = "You are an expert South African legal intake assistant. Return a JSON object with an array of canonical practice area slugs from a fixed list. Keep responses concise and safe for work.";
  const allowed = [
    "administrative-regulatory-law",
    "alternative-dispute-resolution-law",
    "arbitration",
    "aviation-law",
    "banking-financial-services",
    "class-actions",
    "climate-change",
    "commercial-law",
    "company-law",
    "competition-law",
    "constitutional-human-rights-law",
    "construction-engineering-law",
    "contract-law",
    "corporate-commercial-law",
    "credit-consumer-law",
    "criminal-law",
    "customary-law",
    "cyber-law",
    "delictual-claims",
    "employment-labour-law",
    "energy-law",
    "environmental-law",
    "family-law",
    "financial-services-board-litigation",
    "foreign-exchange-law",
    "general-civil-litigation",
    "general-litigation",
    "insolvency-business-rescue-law",
    "insurance-law",
    "intellectual-property-law",
    "investment-funds-law",
    "labour-law",
    "litigation-dispute-resolution",
    "mergers-acquisitions",
    "oil-gas-law",
    "property-law",
    "tax-law"
  ];

  const user = `Problem description: ${input}\nAllowed slugs: ${allowed.join(", ")}\nReturn ONLY strict JSON like {\"practice_area_slugs\": string[]}`;

  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ],
    temperature: 0.2
  });

  const text = res.choices[0]?.message?.content || "{}";
  return text;
}
