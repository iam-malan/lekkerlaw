export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { buildSignature, pfEndpoint } from "@/lib/payfast";
import { nanoid } from "nanoid";

export async function POST(req: NextRequest) {
  try {
    const { firm_id, plan } = await req.json();
    if (!firm_id || !plan) {
      return NextResponse.json({ error: "firm_id and plan are required" }, { status: 400 });
    }

    const mode = process.env.PAYFAST_MODE || "sandbox";
    const { process: action_url } = pfEndpoint(mode);

    const fields: Record<string, string> = {
      merchant_id: process.env.PAYFAST_MERCHANT_ID || "",
      merchant_key: process.env.PAYFAST_MERCHANT_KEY || "",
      return_url: process.env.PAYFAST_RETURN_URL || "",
      cancel_url: process.env.PAYFAST_CANCEL_URL || "",
      notify_url: process.env.PAYFAST_NOTIFY_URL || "",
      name_first: "LekkerLaw",
      email_address: process.env.EMAIL_FROM || "hello@lekkerlaw.co.za",
      m_payment_id: nanoid(),
      amount: plan === "pro" ? "249.00" : plan === "starter" ? "199.00" : "0.00",
      item_name: `LekkerLaw ${plan}`,
      subscription_type: "1",
      frequency: "3",
      cycles: "0",
      recurring_amount: plan === "pro" ? "249.00" : plan === "starter" ? "199.00" : "0.00",
    };

    const signature = buildSignature(fields, process.env.PAYFAST_PASSPHRASE);

    return NextResponse.json({ action_url, fields: { ...fields, signature } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Checkout failed" }, { status: 500 });
  }
}
