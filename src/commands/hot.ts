import type { Command } from "commander";
import type { GitForge } from "@gitforge/sdk";
import { createClient } from "../client";
import { formatJson, formatTable } from "../output";
import * as fs from "fs";

type Logger = (msg: string) => void;

export async function handleHotFileRead(
  client: GitForge,
  repoId: string,
  path: string,
  opts: { ref?: string; include?: string; format?: string },
  log: Logger = console.log,
): Promise<void> {
  const include = opts.include?.split(",") as ("content" | "metadata" | "history")[] | undefined;
  const file = await client.hot.readFile(repoId, path, { ref: opts.ref, include });
  const format = opts.format ?? "json";
  if (format === "json") {
    log(formatJson(file));
  } else {
    log(file.content ?? "");
  }
}

export async function handleHotTreeList(
  client: GitForge,
  repoId: string,
  path: string,
  opts: { ref?: string; depth?: number; format?: string },
  log: Logger = console.log,
): Promise<void> {
  const result = await client.hot.listTree(repoId, path, { ref: opts.ref, depth: opts.depth });
  const format = opts.format ?? "table";
  if (format === "json") {
    log(formatJson(result));
  } else {
    const headers = ["NAME", "TYPE", "MODE", "SHA"];
    const rows = result.entries.map((e: { name: string; type: string; mode: string; sha: string }) => [e.name, e.type, e.mode, e.sha.slice(0, 8)]);
    log(formatTable(headers, rows).trimEnd());
  }
}

export async function handleHotCommit(
  client: GitForge,
  repoId: string,
  opts: { ref: string; message: string; upsert?: string[]; delete?: string[]; format?: string },
  log: Logger = console.log,
): Promise<void> {
  const operations: Array<
    | { action: "upsert"; path: string; content: string }
    | { action: "delete"; path: string }
  > = [];

  if (opts.upsert) {
    for (const spec of opts.upsert) {
      const [filePath, localPath] = spec.split(":");
      const content = localPath ? fs.readFileSync(localPath, "utf-8") : "";
      operations.push({ action: "upsert", path: filePath, content });
    }
  }

  if (opts.delete) {
    for (const filePath of opts.delete) {
      operations.push({ action: "delete", path: filePath });
    }
  }

  const result = await client.hot.commit(repoId, {
    ref: opts.ref,
    message: opts.message,
    operations,
  });

  log(formatJson(result));
}

export async function handleHotRefs(
  client: GitForge,
  repoId: string,
  opts: { pattern?: string; format?: string },
  log: Logger = console.log,
): Promise<void> {
  const result = await client.hot.listRefs(repoId, { pattern: opts.pattern });
  const format = opts.format ?? "table";
  if (format === "json") {
    log(formatJson(result));
  } else {
    const headers = ["NAME", "TYPE", "SHA"];
    const rows = result.refs.map((r: { name: string; type: string; sha: string }) => [r.name, r.type, r.sha.slice(0, 8)]);
    log(formatTable(headers, rows).trimEnd());
  }
}

export function registerHotCommands(program: Command): void {
  const hot = program.command("hot").description("Hot-path file and ref operations");

  hot
    .command("file <repoId> <path>")
    .description("Read a file at a ref")
    .option("--ref <ref>", "Branch, tag, or SHA", "main")
    .option("--include <fields>", "Comma-separated: content,metadata,history")
    .option("--format <fmt>", "Output format (json or raw)", "json")
    .action(async (repoId: string, path: string, opts: Record<string, string>) => {
      try {
        const client = createClient(program.opts().token);
        await handleHotFileRead(client, repoId, path, opts);
      } catch (err: unknown) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  hot
    .command("tree <repoId> [path]")
    .description("List tree entries")
    .option("--ref <ref>", "Branch, tag, or SHA", "main")
    .option("--depth <n>", "Tree depth", parseInt)
    .option("--format <fmt>", "Output format (table or json)", "table")
    .action(async (repoId: string, path: string | undefined, opts: Record<string, string | number>) => {
      try {
        const client = createClient(program.opts().token);
        await handleHotTreeList(client, repoId, path ?? ".", opts as { ref?: string; depth?: number; format?: string });
      } catch (err: unknown) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  hot
    .command("commit <repoId>")
    .description("Create a commit with file operations")
    .requiredOption("--ref <ref>", "Target branch")
    .requiredOption("--message <msg>", "Commit message")
    .option("--upsert <spec...>", "Upsert files (path:localFile)")
    .option("--delete <path...>", "Delete files")
    .option("--format <fmt>", "Output format", "json")
    .action(async (repoId: string, opts: { ref: string; message: string; upsert?: string[]; delete?: string[]; format?: string }) => {
      try {
        const client = createClient(program.opts().token);
        await handleHotCommit(client, repoId, opts);
      } catch (err: unknown) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  hot
    .command("refs <repoId>")
    .description("List refs")
    .option("--pattern <pattern>", "Glob pattern (e.g., refs/heads/*)")
    .option("--format <fmt>", "Output format (table or json)", "table")
    .action(async (repoId: string, opts: { pattern?: string; format?: string }) => {
      try {
        const client = createClient(program.opts().token);
        await handleHotRefs(client, repoId, opts);
      } catch (err: unknown) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });
}
