// Set by Next.js itself while `next build` runs (and never while the server runs: that is "phase-production-server").
const NEXT_BUILD_PHASE = "phase-production-build";

/**
 * Chooses an adapter for an integration from its env switch (e.g. SMS_PROVIDER).
 * Adapters are factories so only the chosen one is constructed.
 *
 * The fake adapter is refused in production so a real deployment can never silently run on it. `next build`
 * also runs with NODE_ENV=production and imports every route, but it only prerenders: it sends no SMS and takes no
 * payment. So the build phase is exempt, and the guard still fires as soon as the production server loads the module.
 */
export function pickAdapter<T>(
  name: string,
  provider: string,
  adapters: Record<string, () => T>,
  nodeEnv: string,
  buildPhase: boolean = process.env.NEXT_PHASE === NEXT_BUILD_PHASE,
): T {
  const make = adapters[provider];
  if (!make) {
    throw new Error(`No "${provider}" adapter for ${name}. Available: ${Object.keys(adapters).join(", ")}`);
  }
  if (provider === "fake" && nodeEnv === "production" && !buildPhase) {
    throw new Error(`Refusing to use the fake ${name} adapter in production. Set ${name.toUpperCase()}_PROVIDER.`);
  }
  return make();
}
