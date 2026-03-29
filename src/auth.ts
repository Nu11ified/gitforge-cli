import { readAuth } from "./config";

/**
 * Resolve authentication token with priority:
 * 1. Explicit flag token (--token)
 * 2. GITFORGE_TOKEN environment variable
 * 3. Stored token from auth.json
 * 4. null (not authenticated)
 */
export function resolveToken(flagToken: string | undefined): string | null {
  // Priority 1: explicit flag
  if (flagToken && flagToken.length > 0) {
    return flagToken;
  }

  // Priority 2: environment variable
  const envToken = process.env.GITFORGE_TOKEN;
  if (envToken && envToken.length > 0) {
    return envToken;
  }

  // Priority 3: stored auth
  const auth = readAuth();
  if (auth.token) {
    return auth.token;
  }

  return null;
}

/**
 * Resolve token or throw if none available.
 */
export function requireToken(flagToken: string | undefined): string {
  const token = resolveToken(flagToken);
  if (!token) {
    throw new Error(
      "Authentication required. Run `gitforge auth login` or set GITFORGE_TOKEN."
    );
  }
  return token;
}
