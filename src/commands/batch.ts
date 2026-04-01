import type { Command } from "commander";
import { createClient } from "../client";
import { formatJson, formatTable } from "../output";

export function registerBatchCommands(program: Command): void {
  const batch = program.command("batch").description("Multi-repo batch operations");

  batch
    .command("branches")
    .description("Create or delete branches across repos")
    .requiredOption("--action <action>", "Action: create or delete")
    .requiredOption("--items <json>", "JSON array of items [{repoId, name, fromRef?}]")
    .option("--atomic", "Atomic mode: all-or-nothing")
    .option("--on-error <strategy>", "Error strategy: continue or stop", "continue")
    .option("--format <fmt>", "Output format (json or table)", "json")
    .action(async (opts: { action: string; items: string; atomic?: boolean; onError?: string; format?: string }) => {
      try {
        const client = createClient(program.opts().token);
        const items = JSON.parse(opts.items) as Array<{ repoId: string; name: string; fromRef?: string }>;
        const batchOpts = { atomic: opts.atomic, onError: opts.onError as "continue" | "stop" | undefined };
        const result = opts.action === "delete"
          ? await client.batch.deleteBranches(items, batchOpts)
          : await client.batch.createBranches(items, batchOpts);

        if (opts.format === "table") {
          const headers = ["REPO", "STATUS", "ERROR"];
          const rows = result.items.map((r: { repoId?: string; status: string; error?: string }) => [
            r.repoId ?? "", r.status, r.error ?? "",
          ]);
          console.log(formatTable(headers, rows).trimEnd());
        } else {
          console.log(formatJson(result));
        }
      } catch (err: unknown) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  batch
    .command("commits")
    .description("Create commits across multiple repos")
    .requiredOption("--items <json>", "JSON array of commit items [{repoId, ref, message, files}]")
    .option("--atomic", "Atomic mode: all-or-nothing")
    .option("--on-error <strategy>", "Error strategy: continue or stop", "continue")
    .option("--format <fmt>", "Output format", "json")
    .action(async (opts: { items: string; atomic?: boolean; onError?: string; format?: string }) => {
      try {
        const client = createClient(program.opts().token);
        const items = JSON.parse(opts.items);
        const result = await client.batch.createCommits(items, {
          atomic: opts.atomic,
          onError: opts.onError as "continue" | "stop" | undefined,
        });
        console.log(formatJson(result));
      } catch (err: unknown) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  batch
    .command("files")
    .description("Read or write files across repos")
    .requiredOption("--action <action>", "Action: read or write")
    .requiredOption("--items <json>", "JSON array of file items")
    .option("--format <fmt>", "Output format", "json")
    .action(async (opts: { action: string; items: string; format?: string }) => {
      try {
        const client = createClient(program.opts().token);
        const items = JSON.parse(opts.items);
        const result = opts.action === "write"
          ? await client.batch.writeFiles(items)
          : await client.batch.readFiles(items);
        console.log(formatJson(result));
      } catch (err: unknown) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  batch
    .command("refs")
    .description("Read refs across repos")
    .requiredOption("--items <json>", "JSON array of [{repoId, pattern?}]")
    .option("--format <fmt>", "Output format", "json")
    .action(async (opts: { items: string; format?: string }) => {
      try {
        const client = createClient(program.opts().token);
        const items = JSON.parse(opts.items);
        const result = await client.batch.readRefs(items);
        console.log(formatJson(result));
      } catch (err: unknown) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  batch
    .command("diff")
    .description("Diff across multiple repos")
    .requiredOption("--items <json>", "JSON array of [{repoId, base, head, paths?, format?}]")
    .option("--format <fmt>", "Output format", "json")
    .action(async (opts: { items: string; format?: string }) => {
      try {
        const client = createClient(program.opts().token);
        const items = JSON.parse(opts.items);
        const result = await client.batch.diff(items);
        console.log(formatJson(result));
      } catch (err: unknown) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });
}
