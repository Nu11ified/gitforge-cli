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
 * Handle `gitforge patch push`.
 * Calls the extract-from-commits endpoint to turn pushed commits into patches.
 */
export async function handlePatchPush(
  client: GitForge,
  opts: { set: string; branch?: string; since?: string },
  log: Logger = console.log,
): Promise<void> {
  // Default branch to patches/<set-name> — get the set to determine the branch
  const ps = await client.patchSets.get(opts.set);
  const branch = opts.branch ?? ps.materializedBranch ?? `patches/${ps.name}`;

  const result = await client.patchSets.extractFromCommits(opts.set, {
    branch,
    since: opts.since,
  });

  if (result.extracted.length === 0) {
    log("No new commits to extract as patches.");
    return;
  }

  log(`Extracted ${result.extracted.length} patch(es):`);
  for (const p of result.extracted) {
    log(`  #${p.order} ${p.name} (${p.id})`);
  }
}

// ---------------------------------------------------------------------------
// Sharing handlers
// ---------------------------------------------------------------------------

/**
 * Handle `gitforge patch publish`.
 */
export async function handlePatchPublish(
  client: GitForge,
  opts: PatchSetIdOpts,
  log: Logger = console.log,
): Promise<void> {
  const result = await client.patchSets.publish(opts.set);
  log(`Published patch set:`);
  log(`  ID:   ${result.id}`);
  log(`  Name: ${result.name}`);
}

/**
 * Handle `gitforge patch unpublish`.
 */
export async function handlePatchUnpublish(
  client: GitForge,
  opts: PatchSetIdOpts,
  log: Logger = console.log,
): Promise<void> {
  await client.patchSets.unpublish(opts.set);
  log(`Unpublished patch set ${opts.set}`);
}

interface PatchForkOpts {
  name?: string;
}

/**
 * Handle `gitforge patch fork <setId>`.
 */
export async function handlePatchFork(
  client: GitForge,
  setId: string,
  opts: PatchForkOpts,
  log: Logger = console.log,
): Promise<void> {
  const result = await client.patchSets.fork(setId, opts.name ? { name: opts.name } : undefined);
  log(`Forked patch set:`);
  log(`  ID:   ${result.id}`);
  log(`  Name: ${result.name}`);
  log(`  From: ${result.forkedFromId}`);
}

/**
 * Handle `gitforge patch subscribe`.
 */
export async function handlePatchSubscribe(
  client: GitForge,
  opts: PatchSetIdOpts,
  log: Logger = console.log,
): Promise<void> {
  await client.patchSets.subscribe(opts.set);
  log(`Subscribed to upstream updates for ${opts.set}`);
}

/**
 * Handle `gitforge patch unsubscribe`.
 */
export async function handlePatchUnsubscribe(
  client: GitForge,
  opts: PatchSetIdOpts,
  log: Logger = console.log,
): Promise<void> {
  await client.patchSets.unsubscribe(opts.set);
  log(`Unsubscribed from upstream updates for ${opts.set}`);
}

/**
 * Handle `gitforge patch updates`.
 */
export async function handlePatchUpdates(
  client: GitForge,
  opts: PatchSetIdOpts & { format?: "table" | "json" | "quiet" },
  log: Logger = console.log,
): Promise<void> {
  const result = await client.patchSets.getUpdates(opts.set);

  const format = opts.format ?? "table";

  if (format === "json") {
    log(JSON.stringify(result, null, 2));
    return;
  }

  if (!result.hasUpdates) {
    log(`No upstream updates for ${opts.set}`);
    return;
  }

  log(`Upstream updates available (${result.changes.length} change(s)):`);
  const headers = ["TYPE", "PATCH", "ORDER"];
  const rows = result.changes.map((c) => [
    c.type,
    c.name,
    String(c.order),
  ]);

  const output = formatOutput(result.changes, headers, rows, format);
  if (output) {
    log(output.trimEnd());
  }
}

interface PatchAcceptOpts {
  set: string;
  all?: boolean;
  patch?: string[];
}

/**
 * Handle `gitforge patch accept`.
 */
export async function handlePatchAccept(
  client: GitForge,
  opts: PatchAcceptOpts,
  log: Logger = console.log,
): Promise<void> {
  const patches: string[] | ["all"] = opts.all ? ["all"] : (opts.patch ?? ["all"]);
  const result = await client.patchSets.acceptUpdates(opts.set, { patches });
  log(`Accepted ${result.accepted} update(s)`);
  if (result.conflicts > 0) {
    log(`  Conflicts: ${result.conflicts}`);
  }
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

  patch
    .command("push")
    .description("Extract pushed commits on the materialized branch as patches")
    .requiredOption("--set <id>", "Patch set ID")
    .option("--branch <branch>", "Branch to extract from (defaults to materialized branch)")
    .option("--since <sha>", "Only extract commits after this SHA")
    .action(async (opts) => {
      try {
        const token = opts.token ?? program.opts().token;
        const client = createClient(token);
        await handlePatchPush(client, opts);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  // ---- Sharing subcommands ----

  patch
    .command("publish")
    .description("Publish a patch set (make public)")
    .requiredOption("--set <id>", "Patch set ID")
    .action(async (opts) => {
      try {
        const token = opts.token ?? program.opts().token;
        const client = createClient(token);
        await handlePatchPublish(client, opts);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  patch
    .command("unpublish")
    .description("Unpublish a patch set (make private)")
    .requiredOption("--set <id>", "Patch set ID")
    .action(async (opts) => {
      try {
        const token = opts.token ?? program.opts().token;
        const client = createClient(token);
        await handlePatchUnpublish(client, opts);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  patch
    .command("fork <setId>")
    .description("Fork a public patch set into your account")
    .option("--name <name>", "Custom name for the fork")
    .action(async (setId, opts) => {
      try {
        const token = opts.token ?? program.opts().token;
        const client = createClient(token);
        await handlePatchFork(client, setId, opts);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  patch
    .command("subscribe")
    .description("Subscribe to upstream updates on a forked patch set")
    .requiredOption("--set <id>", "Patch set ID")
    .action(async (opts) => {
      try {
        const token = opts.token ?? program.opts().token;
        const client = createClient(token);
        await handlePatchSubscribe(client, opts);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  patch
    .command("unsubscribe")
    .description("Unsubscribe from upstream updates")
    .requiredOption("--set <id>", "Patch set ID")
    .action(async (opts) => {
      try {
        const token = opts.token ?? program.opts().token;
        const client = createClient(token);
        await handlePatchUnsubscribe(client, opts);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  patch
    .command("updates")
    .description("Check for upstream updates on a subscribed patch set")
    .requiredOption("--set <id>", "Patch set ID")
    .option("--format <fmt>", "Output format (table or json)", "table")
    .action(async (opts) => {
      try {
        const token = opts.token ?? program.opts().token;
        const client = createClient(token);
        await handlePatchUpdates(client, opts);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  patch
    .command("accept")
    .description("Accept upstream updates into a subscribed patch set")
    .requiredOption("--set <id>", "Patch set ID")
    .option("--all", "Accept all pending updates")
    .option("--patch <id...>", "Accept specific patch IDs")
    .action(async (opts) => {
      try {
        const token = opts.token ?? program.opts().token;
        const client = createClient(token);
        await handlePatchAccept(client, opts);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });
}
