import { parseEnv } from "./env-schema";

/**
 * Validated environment for server code. Fails fast at import with a readable message if config is
 * missing or malformed. Import this only from server code (never from client components).
 */
export const env = parseEnv();
