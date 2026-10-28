import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "worker/**/*.test.ts"],
    // Integration tests need Postgres: run them with `npm run test:int`
    exclude: process.env.INT ? ["node_modules/**"] : ["node_modules/**", "**/*.int.test.ts"],
    fileParallelism: false,
    // Lets tests mock next/headers inside better-auth's nextCookies plugin (externalised packages ignore vi.mock)
    server: { deps: { inline: [/better-auth/] } },
  },
});
