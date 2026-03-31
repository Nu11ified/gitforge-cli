import type { Command } from "commander";
import type { GitForge } from "@gitforge/sdk";
import { createClient } from "../client";
import { formatOutput } from "../output";

type Logger = (msg: string) => void;

export async function handleOpLog(
  client: GitForge,
  opts: { repo: string; format?: string },
  log: Logger = console.log,
): Promise<void> {
  const result = await client.operations.list(opts.repo);
  if (opts.format === "json") {
    log(JSON.stringify(result.items, null, 2));
    return;
  }

  const headers = ["TYPE", "CHANGE", "TIME"];
  const rows = result.items.map((o) => [
    o.operationType,
    o.changeId ?? "(repo)",
    new Date(o.createdAt).toLocaleString(),
  ]);
  const output = formatOutput(result.items, headers, rows, (opts.format as any) ?? "table");
  if (output) {
    log(output.trimEnd());
  }
}

export async function handleOpUndo(
  client: GitForge,
  opts: { repo: string; operation?: string },
  log: Logger = console.log,
): Promise<void> {
  const result = await client.operations.undo(opts.repo, opts.operation);
  log(`Undone: ${result.undoneOperation.operationType}`);
}

/**
 * Register op subcommands with commander.
 */
export function registerOpCommands(program: Command): void {
  const op = program
    .command("op")
    .description("Operation log and undo");

  op
    .command("log")
    .description("Show operation history")
    .requiredOption("--repo <id>", "Repository UUID")
    .option("--format <fmt>", "Output format: table, json")
    .action(async (opts) => {
      try {
        const token = opts.token ?? program.opts().token;
        const client = createClient(token);
        await handleOpLog(client, opts);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  op
    .command("undo")
    .description("Undo last operation")
    .requiredOption("--repo <id>", "Repository UUID")
    .option("--operation <id>", "Specific operation UUID to undo")
    .action(async (opts) => {
      try {
        const token = opts.token ?? program.opts().token;
        const client = createClient(token);
        await handleOpUndo(client, opts);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });
}
