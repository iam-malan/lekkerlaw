import crypto from "node:crypto";

export function buildSignature(fields: Record<string, string>, passphrase?: string) {
  const keys = Object.keys(fields).sort();
  const pairs: string[] = [];
  for (const k of keys) {
    const v = fields[k];
    if (v !== undefined && v !== "") {
      pairs.push(`${k}=${encodeURIComponent(v).replace(/%20/g, "+")}`);
    }
  }
  if (passphrase) {
    pairs.push(`passphrase=${encodeURIComponent(passphrase).replace(/%20/g, "+")}`);
  }
  const str = pairs.join("&");
  return crypto.createHash("md5").update(str).digest("hex");
}

export function pfEndpoint(mode: string | undefined) {
  const live = mode === "live";
  return {
    process: live
      ? "https://www.payfast.co.za/eng/process"
      : "https://sandbox.payfast.co.za/eng/process",
    validate: live
      ? "https://www.payfast.co.za/eng/query/validate"
      : "https://sandbox.payfast.co.za/eng/query/validate",
  } as const;
}
