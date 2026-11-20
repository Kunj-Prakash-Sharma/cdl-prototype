import type { SmsProvider } from "./types";

// Same shape as auth's maskPhone (`+91******6789`); kept local because integrations never import modules.
const mask = (phone: string) => `${phone.slice(0, 3)}${"*".repeat(Math.max(phone.length - 7, 0))}${phone.slice(-4)}`;

// Dev only: prints the code so login works without an SMS provider. The number is masked (no PII in logs).
export const fakeSms: SmsProvider = {
  async sendOtp(phone, code) {
    console.log(`[fake sms] OTP for ${mask(phone)}: ${code}`);
  },
};
