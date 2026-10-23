import { defineConfig } from "drizzle-kit";

// drizzle-kit does not read .env by itself; Node 22 can.
try {
  process.loadEnvFile();
} catch {
  // no .env file: rely on the real environment
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
