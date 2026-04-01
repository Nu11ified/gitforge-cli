import type { Command } from "commander";
import { createClient } from "../client";
import { formatJson } from "../output";
import * as fs from "fs";

export function registerRecipeCommands(program: Command): void {
  const recipe = program.command("recipe").description("Run fleet-wide recipes");

  recipe
    .command("patch-fleet")
    .description("Apply file patches across repos")
    .requiredOption("--repos <ids>", "Comma-separated repo IDs")
    .requiredOption("--branch <name>", "Branch name to create")
    .requiredOption("--message <msg>", "Commit message")
    .option("--file <spec...>", "Files to upsert (path:localFile)")
    .option("--create-pr", "Create PRs after patching")
    .option("--pr-title <title>", "PR title")
    .option("--format <fmt>", "Output format", "json")
    .action(async (opts: { repos: string; branch: string; message: string; file?: string[]; createPr?: boolean; prTitle?: string; format?: string }) => {
      try {
        const client = createClient(program.opts().token);
        const files = (opts.file ?? []).map((spec: string) => {
          const [path, localPath] = spec.split(":");
          return { path, content: localPath ? fs.readFileSync(localPath, "utf-8") : "" };
        });
        const createPr = opts.createPr ? { title: opts.prTitle ?? opts.message } : undefined;
        const result = await client.recipes.patchFleet({
          repos: opts.repos.split(","),
          branchName: opts.branch,
          commitMessage: opts.message,
          files,
          createPr,
        });
        console.log(formatJson(result));
      } catch (err: unknown) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  recipe
    .command("snapshot")
    .description("Snapshot files across repos")
    .requiredOption("--repos <ids>", "Comma-separated repo IDs")
    .option("--paths <paths>", "Comma-separated file paths")
    .option("--ref <ref>", "Branch or tag")
    .option("--format <fmt>", "Output format (json or table)", "json")
    .action(async (opts: { repos: string; paths?: string; ref?: string; format?: string }) => {
      try {
        const client = createClient(program.opts().token);
        const result = await client.recipes.snapshot({
          repos: opts.repos.split(","),
          paths: opts.paths?.split(","),
          ref: opts.ref,
        });
        console.log(formatJson(result));
      } catch (err: unknown) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });
}
