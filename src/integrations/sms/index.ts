import { env } from "@/lib/env";
import { pickAdapter } from "../pick";
import { fakeSms } from "./fake";
import type { SmsProvider } from "./types";

export type { SmsProvider } from "./types";
export const sms: SmsProvider = pickAdapter("sms", env.SMS_PROVIDER, { fake: () => fakeSms }, env.NODE_ENV);
