import type { Command } from "commander";
import type { GitForge } from "@gitforge/sdk";
import { readFileSync } from "fs";
import { createClient } from "../client";
import { formatOutput } from "../output";

type Logger = (msg: string) => void;

export async function handleChangeNew(
  client: GitForge,
  opts: { repo: string; base?: string; description?: string; parent?: string },
  log: Logger = console.log,
): Promise<void> {
  const result = await client.changes.create(opts.repo, {
    baseRef: opts.base,
    description: opts.description,
    parentChangeId: opts.parent,
  });
  log(`Created change: ${result.changeId}`);
  log(`  Status: ${result.status}`);
}

export async function handleChangeList(
  client: GitForge,
  opts: { repo: string; status?: string; format?: string },
  log: Logger = console.log,
): Promise<void> {
  const result = await client.changes.list(opts.repo, { status: opts.status });
  if (opts.format === "json") {
    log(JSON.stringify(result.items, null, 2));
    return;
  }

  const headers = ["CHANGE ID", "STATUS", "DESCRIPTION"];
  const rows = result.items.map((c) => [
    c.changeId,
    c.status,
    (c.description ?? "").slice(0, 50),
  ]);
  const output = formatOutput(result.items, headers, rows, (opts.format as any) ?? "table");
  if (output) {
    log(output.trimEnd());
  }
}

export async function handleChangeShow(
  client: GitForge,
  changeId: string,
  opts: { repo: string },
  log: Logger = console.log,
): Promise<void> {
  const change = await client.changes.get(opts.repo, changeId);
  log(`Change: ${change.changeId}`);
  log(`  Status: ${change.status}`);
  log(`  Commit: ${change.commitSha ?? "(none)"}`);
  log(`  Base: ${change.baseCommitSha}`);
  log(`  Description: ${change.description ?? "(none)"}`);
  if (change.conflictDetails) {
    log(`  Conflict: ${change.conflictDetails}`);
  }
}

export async function handleChangeAmend(
  client: GitForge,
  changeId: string,
  opts: { repo: string; file?: string[]; delete?: string[] },
  log: Logger = console.log,
): Promise<void> {
  const files = (opts.file ?? []).map((f) => ({
    path: f,
    content: readFileSync(f, "utf-8"),
  }));
  const result = await client.changes.amend(opts.repo, changeId, {
    files,
    deletes: opts.delete,
  });
  log(`Amended: ${result.changeId} → ${result.commitSha}`);
}

export async function handleChangeSquash(
  client: GitForge,
  changeId: string,
  opts: { repo: string; files?: string[] },
  log: Logger = console.log,
): Promise<void> {
  const result = await client.changes.squash(opts.repo, changeId, {
    files: opts.files,
  });
  log(`Squashed into parent: ${result.parent.changeId}`);
  log(`  Child ${result.child.changeId} → ${result.child.status}`);
}

export async function handleChangeSplit(
  client: GitForge,
  changeId: string,
  opts: { repo: string; files: string[] },
  log: Logger = console.log,
): Promise<void> {
  const result = await client.changes.split(opts.repo, changeId, { files: opts.files });
  log(`Split into:`);
  log(`  First: ${result.first.changeId} (new)`);
  log(`  Remainder: ${result.remainder.changeId} (original)`);
}

export async function handleChangeDescribe(
  client: GitForge,
  changeId: string,
  opts: { repo: string; message: string },
  log: Logger = console.log,
): Promise<void> {
  const result = await client.changes.describe(opts.repo, changeId, opts.message);
  log(`Updated description for ${result.changeId}`);
}

export async function handleChangeAbandon(
  client: GitForge,
  changeId: string,
  opts: { repo: string },
  log: Logger = console.log,
): Promise<void> {
  const result = await client.changes.abandon(opts.repo, changeId);
  log(`Abandoned: ${result.changeId}`);
}

export async function handleChangeMaterialize(
  client: GitForge,
  changeId: string,
  opts: { repo: string; branch: string },
  log: Logger = console.log,
): Promise<void> {
  const result = await client.changes.materialize(opts.repo, changeId, opts.branch);
  log(`Materialized to branch ${result.branch} at ${result.sha}`);
}

/**
 * Register change subcommands with commander.
 */
export function registerChangeCommands(program: Command): void {
  const change = program
    .command("change")
    .description("Manage changes (jj-like mutable commits)");

  change
    .command("new")
    .description("Create a new change")
    .requiredOption("--repo <id>", "Repository UUID")
    .option("--base <ref>", "Base branch")
    .option("--description <msg>", "Description")
    .option("--parent <changeId>", "Parent change ID for stacking")
    .action(async (opts) => {
      try {
        const token = opts.token ?? program.opts().token;
        const client = createClient(token);
        await handleChangeNew(client, opts);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  change
    .command("list")
    .description("List changes")
    .requiredOption("--repo <id>", "Repository UUID")
    .option("--status <status>", "Filter by status")
    .option("--format <fmt>", "Output format: table, json, quiet")
    .action(async (opts) => {
      try {
        const token = opts.token ?? program.opts().token;
        const client = createClient(token);
        await handleChangeList(client, opts);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  change
    .command("show <changeId>")
    .description("Show change details")
    .requiredOption("--repo <id>", "Repository UUID")
    .action(async (changeId, opts) => {
      try {
        const token = opts.token ?? program.opts().token;
        const client = createClient(token);
        await handleChangeShow(client, changeId, opts);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  change
    .command("amend <changeId>")
    .description("Amend files in a change")
    .requiredOption("--repo <id>", "Repository UUID")
    .option("--file <paths...>", "Files to add/modify")
    .option("--delete <paths...>", "Files to delete")
    .action(async (changeId, opts) => {
      try {
        const token = opts.token ?? program.opts().token;
        const client = createClient(token);
        await handleChangeAmend(client, changeId, opts);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  change
    .command("squash <changeId>")
    .description("Squash into parent")
    .requiredOption("--repo <id>", "Repository UUID")
    .option("--files <paths...>", "Partial squash: specific files only")
    .action(async (changeId, opts) => {
      try {
        const token = opts.token ?? program.opts().token;
        const client = createClient(token);
        await handleChangeSquash(client, changeId, opts);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  change
    .command("split <changeId>")
    .description("Split change into two")
    .requiredOption("--repo <id>", "Repository UUID")
    .requiredOption("--files <paths...>", "Files for the first change")
    .action(async (changeId, opts) => {
      try {
        const token = opts.token ?? program.opts().token;
        const client = createClient(token);
        await handleChangeSplit(client, changeId, opts);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  change
    .command("describe <changeId>")
    .description("Update description")
    .requiredOption("--repo <id>", "Repository UUID")
    .requiredOption("-m, --message <msg>", "New description")
    .action(async (changeId, opts) => {
      try {
        const token = opts.token ?? program.opts().token;
        const client = createClient(token);
        await handleChangeDescribe(client, changeId, opts);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  change
    .command("abandon <changeId>")
    .description("Soft-delete a change")
    .requiredOption("--repo <id>", "Repository UUID")
    .action(async (changeId, opts) => {
      try {
        const token = opts.token ?? program.opts().token;
        const client = createClient(token);
        await handleChangeAbandon(client, changeId, opts);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  change
    .command("materialize <changeId>")
    .description("Push change to branch")
    .requiredOption("--repo <id>", "Repository UUID")
    .requiredOption("--branch <name>", "Target branch name")
    .action(async (changeId, opts) => {
      try {
        const token = opts.token ?? program.opts().token;
        const client = createClient(token);
        await handleChangeMaterialize(client, changeId, opts);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });
}
