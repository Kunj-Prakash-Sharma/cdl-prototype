import type { AiProvider } from "./types";

// Passthrough: shows the approved wording unchanged.
export const fakeAi: AiProvider = {
  async rewordQuestion({ text }) {
    return text;
  },
};
