import type { Command } from "commander";
import type { GitForge } from "@gitforge/sdk";
import { createClient } from "../client";
import { formatOutput } from "../output";

type Logger = (msg: string) => void;

interface RepoCreateOpts {
  name: string;
  visibility?: "public" | "private";
  description?: string;
}

interface RepoListOpts {
  format?: "table" | "json" | "quiet";
  limit?: number;
}

/**
 * Handle `gitforge repo create`.
 */
export async function handleRepoCreate(
  client: GitForge,
  opts: RepoCreateOpts,
  log: Logger = console.log,
): Promise<void> {
  const repo = await client.repos.create({
    name: opts.name,
    visibility: opts.visibility,
    description: opts.description,
  });

  log(`Created repository:`);
  log(`  ID:         ${repo.id}`);
  log(`  Name:       ${repo.name}`);
  log(`  Visibility: ${repo.visibility}`);
  if (repo.description) {
    log(`  Description: ${repo.description}`);
  }
}

/**
 * Handle `gitforge repo list`.
 */
export async function handleRepoList(
  client: GitForge,
  opts: RepoListOpts,
  log: Logger = console.log,
): Promise<void> {
  const result = await client.repos.list({
    limit: opts.limit,
  });

  const format = opts.format ?? "table";

  if (format === "json") {
    log(JSON.stringify(result.data, null, 2));
    return;
  }

  const headers = ["NAME", "VISIBILITY", "UPDATED"];
  const rows = result.data.map((r) => [
    r.name,
    r.visibility,
    r.updatedAt ?? "-",
  ]);

  const output = formatOutput(result.data, headers, rows, format);
  if (output) {
    log(output.trimEnd());
  }
}

/**
 * Handle `gitforge repo get <id>`.
 */
export async function handleRepoGet(
  client: GitForge,
  id: string,
  log: Logger = console.log,
): Promise<void> {
  const repo = await client.repos.get(id);

  log(`Repository details:`);
  log(`  ID:             ${repo.id}`);
  log(`  Name:           ${repo.name}`);
  log(`  Visibility:     ${repo.visibility}`);
  log(`  Default Branch: ${repo.defaultBranch}`);
  if (repo.description) {
    log(`  Description:    ${repo.description}`);
  }
  if (repo.createdAt) {
    log(`  Created:        ${repo.createdAt}`);
  }
  if (repo.updatedAt) {
    log(`  Updated:        ${repo.updatedAt}`);
  }
}

/**
 * Handle `gitforge repo delete <id>`.
 */
export async function handleRepoDelete(
  client: GitForge,
  id: string,
  log: Logger = console.log,
): Promise<void> {
  await client.repos.delete(id);
  log(`Deleted repo ${id}`);
}

/**
 * Register repo subcommands with commander.
 */
export function registerRepoCommands(program: Command): void {
  const repo = program
    .command("repo")
    .description("Manage repositories");

  repo
    .command("create")
    .description("Create a new repository")
    .requiredOption("--name <name>", "Repository name")
    .option("--visibility <vis>", "Visibility (public or private)")
    .option("--description <desc>", "Repository description")
    .action(async (opts) => {
      try {
        const token = opts.token ?? program.opts().token;
        const client = createClient(token);
        await handleRepoCreate(client, opts);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  repo
    .command("list")
    .description("List repositories")
    .option("--format <fmt>", "Output format (table or json)", "table")
    .option("--limit <n>", "Maximum number of repos", parseInt)
    .action(async (opts) => {
      try {
        const token = opts.token ?? program.opts().token;
        const client = createClient(token);
        await handleRepoList(client, opts);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  repo
    .command("get <id>")
    .description("Get repository details")
    .action(async (id, opts) => {
      try {
        const token = opts.token ?? program.opts().token;
        const client = createClient(token);
        await handleRepoGet(client, id);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  repo
    .command("delete <id>")
    .description("Delete a repository")
    .option("--yes", "Skip confirmation")
    .action(async (id, opts) => {
      try {
        if (!opts.yes) {
          console.warn(
            `Warning: This will permanently delete repository ${id}. Use --yes to confirm.`,
          );
        }
        const token = opts.token ?? program.opts().token;
        const client = createClient(token);
        await handleRepoDelete(client, id);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });
}
