import type { Command } from "commander";
import { apiFetch } from "../api";
import { formatOutput } from "../output";

type Logger = (msg: string) => void;

/** Fetch function signature for dependency injection in tests. */
type FetchFn = (path: string, opts?: any) => Promise<any>;

interface AppCreateOpts {
  name: string;
}

interface AppListOpts {
  format?: "table" | "json" | "quiet";
}

interface AppTokenOpts {
  appId: string;
  installId: string;
}

interface AppInfo {
  id: string;
  name: string;
  clientId: string;
  clientSecret?: string;
  description?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Handle `gitforge app create --name <name>`.
 */
export async function handleAppCreate(
  opts: AppCreateOpts,
  log: Logger = console.log,
  fetchFn: FetchFn = apiFetch,
): Promise<void> {
  const app: AppInfo = await fetchFn("/admin/apps", {
    method: "POST",
    body: { name: opts.name },
  });

  log(`Created app "${app.name}":`);
  log(`  ID:        ${app.id}`);
  log(`  Client ID: ${app.clientId}`);
  if (app.clientSecret) {
    log(`  Secret:    ${app.clientSecret}`);
    log("");
    log("Save this secret -- it will not be shown again.");
  }
}

/**
 * Handle `gitforge app list [--format table|json]`.
 */
export async function handleAppList(
  opts: AppListOpts,
  log: Logger = console.log,
  fetchFn: FetchFn = apiFetch,
): Promise<void> {
  const apps: AppInfo[] = await fetchFn("/admin/apps");

  const format = opts.format ?? "table";

  if (format === "json") {
    log(JSON.stringify(apps, null, 2));
    return;
  }

  const headers = ["ID", "NAME", "CLIENT ID", "CREATED"];
  const rows = apps.map((a) => [
    a.id,
    a.name,
    a.clientId,
    a.createdAt,
  ]);

  const output = formatOutput(apps, headers, rows, format);
  if (output) {
    log(output.trimEnd());
  }
}

/**
 * Handle `gitforge app token <appId> --install <installId>`.
 */
export async function handleAppToken(
  opts: AppTokenOpts,
  log: Logger = console.log,
  fetchFn: FetchFn = apiFetch,
): Promise<void> {
  const result = await fetchFn(
    `/admin/apps/${opts.appId}/installations/${opts.installId}/token`,
    { method: "POST" },
  );

  log(`Installation token: ${result.token}`);
  if (result.expiresAt) {
    log(`Expires at: ${result.expiresAt}`);
  }
}

/**
 * Register app subcommands with commander.
 */
export function registerAppCommands(program: Command): void {
  const app = program
    .command("app")
    .description("Manage OAuth applications");

  app
    .command("create")
    .description("Create a new OAuth application")
    .requiredOption("--name <name>", "Application name")
    .option("--token <pat>", "Authentication token")
    .action(async (opts) => {
      try {
        await handleAppCreate(opts);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  app
    .command("list")
    .description("List OAuth applications")
    .option("--format <fmt>", "Output format (table or json)", "table")
    .option("--token <pat>", "Authentication token")
    .action(async (opts) => {
      try {
        await handleAppList(opts);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  app
    .command("token <appId>")
    .description("Generate an installation token")
    .requiredOption("--install <installId>", "Installation ID")
    .option("--token <pat>", "Authentication token")
    .action(async (appId, opts) => {
      try {
        await handleAppToken({ appId, installId: opts.install });
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });
}
