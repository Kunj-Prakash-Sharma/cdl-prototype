// Seeds local/dev data. Fills in as modules land (placeholder courses from the prototype data on day 1).
// Never run against production.
import { parseEnv } from "@/lib/env-schema";

const env = parseEnv();
if (env.NODE_ENV === "production") {
  console.error("seed: refusing to run in production");
  process.exit(1);
}
console.log("seed: nothing to seed yet");
