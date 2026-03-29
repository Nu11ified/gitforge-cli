import type { Command } from "commander";

export function registerTokenCommands(program: Command): void {
  const token = program
    .command("token")
    .description("Manage personal access tokens");

  token
    .command("create")
    .description("Create a new personal access token")
    .action(() => {
      console.log("token create: not yet implemented");
    });

  token
    .command("list")
    .description("List personal access tokens")
    .action(() => {
      console.log("token list: not yet implemented");
    });

  token
    .command("revoke")
    .description("Revoke a personal access token")
    .action(() => {
      console.log("token revoke: not yet implemented");
    });
}
