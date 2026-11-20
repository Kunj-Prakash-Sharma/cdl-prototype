import type { EmailProvider } from "./types";

// Dev only: prints instead of sending.
export const fakeEmail: EmailProvider = {
  async send(template, to, data) {
    console.log(`[fake email] ${template} -> ${to}`, JSON.stringify(data));
  },
};
