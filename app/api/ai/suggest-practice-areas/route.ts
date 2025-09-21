import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  const { input_text } = await req.json();
  if (!input_text || typeof input_text !== "string") {
    return NextResponse.json({ error: "input_text required" }, { status: 400 });
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ practice_area_slugs: [] });
  }
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const system = "You are an expert South African legal intake assistant. Return JSON with an array 'practice_area_slugs' using canonical slugs only.";
  const allowed = [
    "administrative-regulatory-law","alternative-dispute-resolution-law","arbitration","aviation-law","banking-financial-services","class-actions","climate-change","commercial-law","company-law","competition-law","constitutional-human-rights-law","construction-engineering-law","contract-law","corporate-commercial-law","credit-consumer-law","criminal-law","customary-law","cyber-law","delictual-claims","employment-labour-law","energy-law","environmental-law","family-law","financial-services-board-litigation","foreign-exchange-law","general-civil-litigation","general-litigation","insolvency-business-rescue-law","insurance-law","intellectual-property-law","investment-funds-law","labour-law","litigation-dispute-resolution","mergers-acquisitions","oil-gas-law","property-law","tax-law"
  ];
  const user = `Problem: ${input_text}\nAllowed slugs: ${allowed.join(", ")}\nReturn ONLY JSON: {"practice_area_slugs": string[]}`;
  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.2,
  });
  const text = res.choices[0]?.message?.content || "{}";
  try {
    const parsed = JSON.parse(text);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ practice_area_slugs: [] });
  }
}
