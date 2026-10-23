import { env } from "@/lib/env";
import { pickAdapter } from "../pick";
import { fakeStorage } from "./fake";
import type { StorageProvider } from "./types";

export type { StorageProvider } from "./types";
export const storage: StorageProvider = pickAdapter(
  "storage",
  env.STORAGE_PROVIDER,
  { fake: () => fakeStorage },
  env.NODE_ENV,
);
