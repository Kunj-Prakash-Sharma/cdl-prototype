// Safe to import from client components: types only.

/**
 * What a server action returns: `{ ok: true, ...data }` or `{ ok: false, code }`. The UI owns all wording; the codes are
 * the contract. Each module passes its own code union as `C` (auth: `AuthErrorCode`).
 */
export type ActionResult<T extends object = object, C extends string = string> =
  ({ ok: true } & T) | { ok: false; code: C; retryAfterSec?: number };
