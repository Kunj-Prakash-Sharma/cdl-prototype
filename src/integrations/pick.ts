/**
 * Chooses an adapter for an integration from its env switch (e.g. SMS_PROVIDER).
 * Adapters are factories so only the chosen one is constructed.
 */
export function pickAdapter<T>(name: string, provider: string, adapters: Record<string, () => T>, nodeEnv: string): T {
  const make = adapters[provider];
  if (!make) {
    throw new Error(`No "${provider}" adapter for ${name}. Available: ${Object.keys(adapters).join(", ")}`);
  }
  if (provider === "fake" && nodeEnv === "production") {
    throw new Error(`Refusing to use the fake ${name} adapter in production. Set ${name.toUpperCase()}_PROVIDER.`);
  }
  return make();
}
