import type { Command } from "commander";

export function registerAppCommands(program: Command): void {
  const app = program
    .command("app")
    .description("Manage OAuth applications");

  app
    .command("create")
    .description("Create a new OAuth application")
    .action(() => {
      console.log("app create: not yet implemented");
    });

  app
    .command("list")
    .description("List OAuth applications")
    .action(() => {
      console.log("app list: not yet implemented");
    });

  app
    .command("token")
    .description("Generate an application token")
    .action(() => {
      console.log("app token: not yet implemented");
    });
}
