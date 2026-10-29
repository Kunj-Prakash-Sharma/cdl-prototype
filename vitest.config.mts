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
    // Integration tests run on the separate `self_test` database, never the dev one (tests/support/*).
    // The setup file refuses any database whose name does not end in `_test`.
    globalSetup: process.env.INT ? ["tests/support/global-setup.ts"] : [],
    setupFiles: process.env.INT ? ["tests/support/setup-int-db.ts"] : [],
    // Lets tests mock next/headers inside better-auth's nextCookies plugin (externalised packages ignore vi.mock)
    server: { deps: { inline: [/better-auth/] } },
  },
});
