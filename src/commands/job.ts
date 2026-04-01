import type { Command } from "commander";
import { createClient } from "../client";
import { formatJson, formatTable } from "../output";

export function registerJobCommands(program: Command): void {
  const jobs = program.command("jobs").description("Manage async jobs");

  jobs
    .command("list")
    .description("List jobs")
    .option("--status <status>", "Filter by status")
    .option("--type <type>", "Filter by recipe type")
    .option("--limit <n>", "Max results", parseInt)
    .option("--format <fmt>", "Output format (table or json)", "table")
    .action(async (opts: { status?: string; type?: string; limit?: number; format?: string }) => {
      try {
        const client = createClient(program.opts().token);
        const result = await client.jobs.list({
          status: opts.status,
          type: opts.type,
          limit: opts.limit,
        });
        if (opts.format === "json") {
          console.log(formatJson(result));
        } else {
          const headers = ["ID", "TYPE", "STATUS", "CREATED"];
          const rows = result.data.map((j: { id: string; type: string; status: string; createdAt: string }) => [j.id, j.type, j.status, j.createdAt]);
          console.log(formatTable(headers, rows).trimEnd());
        }
      } catch (err: unknown) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  jobs
    .command("status <jobId>")
    .description("Get job status")
    .option("--format <fmt>", "Output format", "json")
    .action(async (jobId: string) => {
      try {
        const client = createClient(program.opts().token);
        const job = await client.jobs.get(jobId);
        console.log(formatJson(job));
      } catch (err: unknown) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  jobs
    .command("cancel <jobId>")
    .description("Cancel a running job")
    .action(async (jobId: string) => {
      try {
        const client = createClient(program.opts().token);
        await client.jobs.cancel(jobId);
        console.log(`Job ${jobId} cancelled`);
      } catch (err: unknown) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });
}
