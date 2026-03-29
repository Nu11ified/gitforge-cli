import type { Command } from "commander";

export function registerStatusCommand(program: Command): void {
  program
    .command("status")
    .description("Show GitForge instance status and connectivity")
    .action(() => {
      console.log("status: not yet implemented");
    });
}
