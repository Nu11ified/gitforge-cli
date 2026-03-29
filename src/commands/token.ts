import type { Command } from "commander";
import { apiFetch } from "../api";
import { formatOutput } from "../output";

type Logger = (msg: string) => void;

/** Fetch function signature for dependency injection in tests. */
type FetchFn = (path: string, opts?: any) => Promise<any>;

interface TokenCreateOpts {
  name: string;
  scopes?: string;
}

interface TokenListOpts {
  format?: "table" | "json" | "quiet";
}

interface PatCreateResponse {
  token: string;
  pat: {
    id: string;
    name: string;
    scopes: string[];
    createdAt: string;
  };
}

interface PatInfo {
  id: string;
  name: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt?: string | null;
}

/**
 * Handle `gitforge token create --name <name> --scopes <scopes>`.
 */
export async function handleTokenCreate(
  opts: TokenCreateOpts,
  log: Logger = console.log,
  fetchFn: FetchFn = apiFetch,
): Promise<void> {
  const scopes = opts.scopes
    ? opts.scopes.split(",").map((s) => s.trim()).filter(Boolean)
    : ["repo:read", "repo:write"];

  const result: PatCreateResponse = await fetchFn("/auth/pats", {
    method: "POST",
    body: { name: opts.name, scopes },
  });

  log(`Created token "${result.pat.name}":`);
  log(`  ID:     ${result.pat.id}`);
  log(`  Token:  ${result.token}`);
  log(`  Scopes: ${result.pat.scopes.join(", ")}`);
  log("");
  log("Save this token -- it will not be shown again.");
}

/**
 * Handle `gitforge token list [--format table|json]`.
 */
export async function handleTokenList(
  opts: TokenListOpts,
  log: Logger = console.log,
  fetchFn: FetchFn = apiFetch,
): Promise<void> {
  const pats: PatInfo[] = await fetchFn("/auth/pats");

  const format = opts.format ?? "table";

  if (format === "json") {
    log(JSON.stringify(pats, null, 2));
    return;
  }

  const headers = ["ID", "NAME", "SCOPES", "CREATED", "LAST USED"];
  const rows = pats.map((p) => [
    p.id,
    p.name,
    p.scopes.join(", "),
    p.createdAt,
    p.lastUsedAt ?? "never",
  ]);

  const output = formatOutput(pats, headers, rows, format);
  if (output) {
    log(output.trimEnd());
  }
}

/**
 * Handle `gitforge token revoke <id>`.
 */
export async function handleTokenRevoke(
  id: string,
  log: Logger = console.log,
  fetchFn: FetchFn = apiFetch,
): Promise<void> {
  await fetchFn(`/auth/pats/${id}`, { method: "DELETE" });
  log(`Revoked token ${id}`);
}

/**
 * Register token subcommands with commander.
 */
export function registerTokenCommands(program: Command): void {
  const token = program
    .command("token")
    .description("Manage personal access tokens");

  token
    .command("create")
    .description("Create a new personal access token")
    .requiredOption("--name <name>", "Token name")
    .option("--scopes <scopes>", "Comma-separated scopes (default: repo:read,repo:write)")
    .action(async (opts) => {
      try {
        await handleTokenCreate(opts);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  token
    .command("list")
    .description("List personal access tokens")
    .option("--format <fmt>", "Output format (table or json)", "table")
    .action(async (opts) => {
      try {
        await handleTokenList(opts);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  token
    .command("revoke <id>")
    .description("Revoke a personal access token")
    .action(async (id, _opts) => {
      try {
        await handleTokenRevoke(id);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });
}
