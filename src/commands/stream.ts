import type { Command } from "commander";
import { createClient } from "../client";

export function registerStreamCommands(program: Command): void {
  const stream = program.command("stream").description("Live event streams");

  stream
    .command("changes")
    .description("Stream live changes (NDJSON)")
    .option("--repos <ids>", "Comma-separated repo IDs")
    .option("--types <types>", "Comma-separated event types")
    .option("--paths <paths>", "Comma-separated path filters")
    .action(async (opts: { repos?: string; types?: string; paths?: string }) => {
      try {
        const client = createClient(program.opts().token);
        const events = client.streams.changes({
          repos: opts.repos?.split(","),
          eventTypes: opts.types?.split(","),
          paths: opts.paths?.split(","),
        });
        for await (const event of events) {
          process.stdout.write(JSON.stringify(event) + "\n");
        }
      } catch (err: unknown) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });
}
