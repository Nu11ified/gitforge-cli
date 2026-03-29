import type { Command } from "commander";
import { readConfig, readAuth } from "../config";
import { resolveToken } from "../auth";
import { apiFetch } from "../api";

type Logger = (msg: string) => void;

/** Fetch function signature for dependency injection in tests. */
type FetchFn = (path: string, opts?: any) => Promise<any>;

/**
 * Determine where the token came from for display purposes.
 */
function tokenSource(flagToken?: string): string {
  if (flagToken && flagToken.length > 0) return "flag";
  if (process.env.GITFORGE_TOKEN) return "env";
  const auth = readAuth();
  if (auth.token) return "stored";
  return "none";
}

/**
 * Handle `gitforge status`.
 * Shows auth status, endpoint, and connectivity check.
 */
export async function handleStatus(
  log: Logger = console.log,
  fetchFn?: FetchFn,
  flagToken?: string,
): Promise<void> {
  const config = readConfig();
  const token = resolveToken(flagToken ?? undefined);
  const source = tokenSource(flagToken);

  log("GitForge CLI Status");
  log("-------------------");
  log(`Endpoint: ${config.endpoint}`);

  if (token) {
    const masked = token.substring(0, 6) + "...";
    log(`Auth:     Authenticated (${masked}) [source: ${source}]`);
  } else {
    log("Auth:     Not authenticated");
    log("          Run `gitforge auth login` or set GITFORGE_TOKEN.");
    return;
  }

  // Connectivity check
  const doFetch = fetchFn ?? apiFetch;
  try {
    const result = await doFetch("/repos?limit=1", { token });
    const total = result?.total ?? result?.data?.length ?? 0;
    log(`API:      Connected (${total} repos)`);
  } catch (err: any) {
    log(`API:      Not reachable (${err.message})`);
  }
}

/**
 * Register status command with commander.
 */
export function registerStatusCommand(program: Command): void {
  program
    .command("status")
    .description("Show GitForge instance status and connectivity")
    .action(async (opts) => {
      try {
        const token = opts.token ?? program.opts().token;
        await handleStatus(console.log, undefined, token);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });
}
