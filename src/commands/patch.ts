import type { Command } from "commander";
import type { GitForge } from "@gitforge/sdk";
import { readFileSync } from "fs";
import { createClient } from "../client";
import { formatOutput } from "../output";

type Logger = (msg: string) => void;

interface PatchCreateOpts {
  repo: string;
  base?: string;
  description?: string;
}

interface PatchListOpts {
  repo: string;
  format?: "table" | "json" | "quiet";
}

interface PatchAddOpts {
  set: string;
  name: string;
  diff?: string;
}

interface PatchSetIdOpts {
  set: string;
}

interface PatchTargetOpts {
  set: string;
}

/**
 * Handle `gitforge patch create <name>`.
 */
export async function handlePatchCreate(
  client: GitForge,
  name: string,
  opts: PatchCreateOpts,
  log: Logger = console.log,
): Promise<void> {
  const result = await client.patchSets.create(opts.repo, {
    name,
    baseRef: opts.base,
    description: opts.description,
  });

  log(`Created patch set:`);
  log(`  ID:     ${result.id}`);
  log(`  Name:   ${result.name}`);
  log(`  Branch: ${result.materializedBranch}`);
}

/**
 * Handle `gitforge patch list`.
 */
export async function handlePatchList(
  client: GitForge,
  opts: PatchListOpts,
  log: Logger = console.log,
): Promise<void> {
  const result = await client.patchSets.list({ repoId: opts.repo });

  const format = opts.format ?? "table";

  if (format === "json") {
    log(JSON.stringify(result, null, 2));
    return;
  }

  const headers = ["NAME", "STATUS", "BASE REF", "AUTO-REBASE"];
  const rows = result.map((ps) => [
    ps.name,
    ps.status,
    ps.baseRef,
    ps.autoRebase ? "on" : "off",
  ]);

  const output = formatOutput(result, headers, rows, format);
  if (output) {
    log(output.trimEnd());
  }
}

/**
 * Handle `gitforge patch add`.
 */
export async function handlePatchAdd(
  client: GitForge,
  opts: PatchAddOpts,
  log: Logger = console.log,
): Promise<void> {
  let diff: string;

  if (opts.diff) {
    diff = readFileSync(opts.diff, "utf-8");
  } else {
    // Read from stdin
    diff = readFileSync("/dev/stdin", "utf-8");
  }

  const result = await client.patchSets.addPatch(opts.set, {
    name: opts.name,
    diff,
  });

  log(`Added patch:`);
  log(`  ID:    ${result.id}`);
  log(`  Order: ${result.order}`);
}

/**
 * Handle `gitforge patch rebase`.
 */
export async function handlePatchRebase(
  client: GitForge,
  opts: PatchSetIdOpts,
  log: Logger = console.log,
): Promise<void> {
  const result = await client.patchSets.rebase(opts.set);
  log(`Rebase complete. Status: ${result.status}`);
  if (result.conflictedPatch) {
    log(`  Conflicted patch: ${result.conflictedPatch}`);
  }
}

/**
 * Handle `gitforge patch enable <name-or-id>`.
 */
export async function handlePatchEnable(
  client: GitForge,
  nameOrId: string,
  opts: PatchTargetOpts,
  log: Logger = console.log,
): Promise<void> {
  await client.patchSets.updatePatch(opts.set, nameOrId, { status: "enabled" });
  log(`Enabled patch ${nameOrId}`);
}

/**
 * Handle `gitforge patch disable <name-or-id>`.
 */
export async function handlePatchDisable(
  client: GitForge,
  nameOrId: string,
  opts: PatchTargetOpts,
  log: Logger = console.log,
): Promise<void> {
  await client.patchSets.updatePatch(opts.set, nameOrId, { status: "disabled" });
  log(`Disabled patch ${nameOrId}`);
}

/**
 * Handle `gitforge patch materialize`.
 */
export async function handlePatchMaterialize(
  client: GitForge,
  opts: PatchSetIdOpts,
  log: Logger = console.log,
): Promise<void> {
  const result = await client.patchSets.materialize(opts.set);
  log(`Materialized. Head SHA: ${result.headSha}`);
  log(`Status: ${result.status}`);
}

/**
 * Register patch subcommands with commander.
 */
export function registerPatchCommands(program: Command): void {
  const patch = program
    .command("patch")
    .description("Manage patch sets");

  patch
    .command("create <name>")
    .description("Create a new patch set")
    .requiredOption("--repo <id>", "Repository ID")
    .option("--base <ref>", "Base ref (default: main)")
    .option("--description <desc>", "Patch set description")
    .action(async (name, opts) => {
      try {
        const token = opts.token ?? program.opts().token;
        const client = createClient(token);
        await handlePatchCreate(client, name, opts);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  patch
    .command("list")
    .description("List patch sets for a repo")
    .requiredOption("--repo <id>", "Repository ID")
    .option("--format <fmt>", "Output format (table or json)", "table")
    .action(async (opts) => {
      try {
        const token = opts.token ?? program.opts().token;
        const client = createClient(token);
        await handlePatchList(client, opts);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  patch
    .command("add")
    .description("Add a patch to a patch set")
    .requiredOption("--set <id>", "Patch set ID")
    .requiredOption("--name <name>", "Patch name")
    .option("--diff <file>", "Diff file (reads stdin if omitted)")
    .action(async (opts) => {
      try {
        const token = opts.token ?? program.opts().token;
        const client = createClient(token);
        await handlePatchAdd(client, opts);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  patch
    .command("rebase")
    .description("Rebase a patch set against upstream")
    .requiredOption("--set <id>", "Patch set ID")
    .action(async (opts) => {
      try {
        const token = opts.token ?? program.opts().token;
        const client = createClient(token);
        await handlePatchRebase(client, opts);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  patch
    .command("enable <nameOrId>")
    .description("Enable a patch in a patch set")
    .requiredOption("--set <id>", "Patch set ID")
    .action(async (nameOrId, opts) => {
      try {
        const token = opts.token ?? program.opts().token;
        const client = createClient(token);
        await handlePatchEnable(client, nameOrId, opts);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  patch
    .command("disable <nameOrId>")
    .description("Disable a patch in a patch set")
    .requiredOption("--set <id>", "Patch set ID")
    .action(async (nameOrId, opts) => {
      try {
        const token = opts.token ?? program.opts().token;
        const client = createClient(token);
        await handlePatchDisable(client, nameOrId, opts);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  patch
    .command("materialize")
    .description("Materialize a patch set into a git branch")
    .requiredOption("--set <id>", "Patch set ID")
    .action(async (opts) => {
      try {
        const token = opts.token ?? program.opts().token;
        const client = createClient(token);
        await handlePatchMaterialize(client, opts);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });
}
