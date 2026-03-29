import type { Command } from "commander";

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("Initialize a new repository in the current directory")
    .action(() => {
      console.log("init: not yet implemented");
    });
}
