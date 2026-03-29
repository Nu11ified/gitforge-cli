import type { Command } from "commander";
import { writeConfig, writeAuth } from "../config";
import { apiFetch } from "../api";

type Logger = (msg: string) => void;

/** Fetch function signature for dependency injection in tests. */
type FetchFn = (path: string, opts?: any) => Promise<any>;

interface InitOpts {
  endpoint?: string;
  token?: string;
}

/**
 * Handle `gitforge init`.
 * Non-interactive mode: accepts --endpoint and --token flags.
 * Saves config + auth, then verifies connectivity.
 */
export async function handleInit(
  opts: InitOpts,
  log: Logger = console.log,
  fetchFn?: FetchFn,
): Promise<void> {
  const endpoint = opts.endpoint ?? "http://localhost:3001";
  const token = opts.token;

  if (!token) {
    throw new Error(
      "Token is required. Use --token <pat> or set GITFORGE_TOKEN.",
    );
  }

  // Save config and auth
  writeConfig({ endpoint });
  writeAuth({ token });

  log(`Configuration saved.`);
  log(`  Endpoint: ${endpoint}`);

  // Verify connectivity
  const doFetch = fetchFn ?? apiFetch;
  try {
    const result = await doFetch("/repos?limit=1", { token });
    const total = result?.total ?? 0;
    log("");
    log(`Connected successfully! (${total} repos found)`);
  } catch (err: any) {
    log("");
    log(`Warning: Could not verify connectivity (${err.message})`);
    log("Configuration was saved. You can check later with `gitforge status`.");
  }

  log("");
  log("Next steps:");
  log("  gitforge status          -- check connectivity");
  log("  gitforge repo list       -- list repositories");
  log("  gitforge repo create     -- create a new repo");
}

/**
 * Register init command with commander.
 */
export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("Initialize GitForge CLI configuration")
    .option("--endpoint <url>", "GitForge API endpoint (default: http://localhost:3001)")
    .action(async (opts) => {
      try {
        const token = opts.token ?? program.opts().token;
        await handleInit({ ...opts, token });
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });
}
