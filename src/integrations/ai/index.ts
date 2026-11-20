import { env } from "@/lib/env";
import { pickAdapter } from "../pick";
import { fakeAi } from "./fake";
import { rewordWithFallback } from "./safe";
import type { AiProvider, RewordInput } from "./types";

export type { AiProvider, RewordInput } from "./types";

const REWORD_TIMEOUT_MS = 3000;
const adapter: AiProvider = pickAdapter("ai", env.AI_PROVIDER, { fake: () => fakeAi }, env.NODE_ENV);

// Per-user daily cap and the total spend cutoff live in the real adapter.
export const ai: AiProvider = {
  rewordQuestion: (input: RewordInput) => rewordWithFallback(adapter, input, REWORD_TIMEOUT_MS),
};
