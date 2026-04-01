import type { Command } from "commander";
import { createClient } from "../client";
import { formatJson } from "../output";

export function registerStateCommands(program: Command): void {
  const state = program.command("state").description("Query latest repo state");

  state
    .command("current")
    .description("Read current file state across repos")
    .requiredOption("--repo <ids>", "Comma-separated repo IDs")
    .requiredOption("--paths <paths>", "Comma-separated file paths")
    .option("--ref <ref>", "Branch or tag")
    .option("--format <fmt>", "Output format (json or table)", "json")
    .action(async (opts: { repo: string; paths: string; ref?: string; format?: string }) => {
      try {
        const client = createClient(program.opts().token);
        const repoIds = opts.repo.split(",");
        const paths = opts.paths.split(",");
        const items = repoIds.map((repoId: string) => ({
          repoId,
          paths,
          ref: opts.ref,
        }));
        const result = await client.state.current(items);
        console.log(formatJson(result));
      } catch (err: unknown) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });
}
