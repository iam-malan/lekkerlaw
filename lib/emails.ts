import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(opts: { to: string | string[]; subject: string; text: string }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set; skipping email send in dev");
    return { skipped: true } as const;
  }
  return await resend.emails.send({
    from: process.env.EMAIL_FROM || "hello@lekkerlaw.co.za",
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
  });
}
