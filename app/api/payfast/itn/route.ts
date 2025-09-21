export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { pfEndpoint, buildSignature } from "@/lib/payfast";

function parseFormEncoded(body: string) {
  const params = new URLSearchParams(body);
  const obj: Record<string, string> = {};
  for (const [k, v] of params.entries()) obj[k] = v;
  return obj;
}

async function validateWithPayFast(fields: Record<string, string>) {
  const { validate } = pfEndpoint(process.env.PAYFAST_MODE || "sandbox");
  const res = await fetch(validate, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields),
  });
  const text = await res.text();
  return text.includes("VALID");
}

export async function POST(req: NextRequest) {
  try {
    const bodyText = await req.text();
    const allFields = parseFormEncoded(bodyText);
    const { signature, ...unsigned } = allFields;
    const expected = buildSignature(unsigned, process.env.PAYFAST_PASSPHRASE);
    if (!signature || signature !== expected) {
      return new NextResponse("invalid signature", { status: 400 });
    }
    const ok = await validateWithPayFast(allFields);
    if (!ok) {
      return new NextResponse("invalid validation", { status: 400 });
    }
    // TODO: update subscriptions and payments using Supabase service role
    return new NextResponse("OK", { status: 200 });
  } catch (e: any) {
    return new NextResponse(e?.message || "error", { status: 500 });
  }
}
