import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  // The test server (`npm run dev:test`, Playwright) uses its own build folder, because Next 16 allows only one
  // dev server per build folder. That lets it run next to your normal `npm run dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  cacheComponents: true,
  partialPrefetching: true,
  // /admin has no page of its own: Users is the only admin section so far. A config redirect (not a page that
  // calls redirect()) keeps Next's dev-time instant-navigation validation quiet. Logged-out visitors continue to
  // /login through proxy.ts.
  async redirects() {
    return [{ source: "/admin", destination: "/admin/users", permanent: false }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
