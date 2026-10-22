import { env } from "@/lib/env";
import { pickAdapter } from "../pick";
import { fakeEmail } from "./fake";
import type { EmailProvider } from "./types";

export type { EmailProvider, EmailTemplates, TemplateName } from "./types";
export const email: EmailProvider = pickAdapter("email", env.EMAIL_PROVIDER, { fake: () => fakeEmail }, env.NODE_ENV);
