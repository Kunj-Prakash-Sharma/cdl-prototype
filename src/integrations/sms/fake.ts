import type { SmsProvider } from "./types";

// Dev only: prints the code so login works without an SMS provider.
export const fakeSms: SmsProvider = {
  async sendOtp(phone, code) {
    console.log(`[fake sms] OTP for ${phone}: ${code}`);
  },
};
