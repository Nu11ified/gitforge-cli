import type { Command } from "commander";
import type { GitForge } from "@gitforge/sdk";
import { createClient } from "../client";
import { formatJson } from "../output";

type Logger = (msg: string) => void;

export async function handleShellExec(
  client: GitForge,
  repoId: string,
  command: string,
  opts: { session?: string; ref?: string; format?: string; token?: string },
  log: Logger = console.log,
): Promise<void> {
  const result = await client.shell.exec(repoId, command, {
    sessionId: opts.session,
    ref: opts.ref,
  });

  const format = opts.format ?? "text";
  if (format === "json") {
    log(formatJson(result));
  } else {
    if (result.stdout) {
      log(result.stdout);
    }
    if (result.stderr) {
      log(`stderr: ${result.stderr}`);
    }
    log(
      `[session: ${result.sessionId} | exit: ${result.exitCode} | ref: ${result.ref ?? "none"} | head: ${result.headSha ?? "none"} | pending: ${result.pendingChanges} file(s)]`,
    );
  }
}

export async function handleShellDestroy(
  client: GitForge,
  sessionId: string,
  opts: { token?: string },
  log: Logger = console.log,
): Promise<void> {
  const result = await client.shell.destroy(sessionId);
  log(formatJson(result));
}

export function registerShellCommands(program: Command): void {
  const shell = program.command("shell").description("Virtual filesystem shell sessions");

  shell
    .command("exec <repoId> <command>")
    .description("Execute a command in a VFS shell session")
    .option("--session <id>", "Reuse an existing session")
    .option("--ref <branch>", "Branch or tag (default: repo default)")
    .option("--format <fmt>", "Output format: text or json", "text")
    .action(async (repoId: string, command: string, opts: { session?: string; ref?: string; format?: string }) => {
      try {
        const client = createClient(program.opts().token);
        await handleShellExec(client, repoId, command, opts);
      } catch (err: unknown) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  shell
    .command("destroy <sessionId>")
    .description("Destroy a shell session")
    .action(async (sessionId: string, opts: { token?: string }) => {
      try {
        const client = createClient(program.opts().token);
        await handleShellDestroy(client, sessionId, opts);
      } catch (err: unknown) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });
}
