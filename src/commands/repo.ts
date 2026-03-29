import type { Command } from "commander";

export function registerRepoCommands(program: Command): void {
  const repo = program
    .command("repo")
    .description("Manage repositories");

  repo
    .command("create")
    .description("Create a new repository")
    .action(() => {
      console.log("repo create: not yet implemented");
    });

  repo
    .command("list")
    .description("List repositories")
    .action(() => {
      console.log("repo list: not yet implemented");
    });

  repo
    .command("get")
    .description("Get repository details")
    .action(() => {
      console.log("repo get: not yet implemented");
    });

  repo
    .command("delete")
    .description("Delete a repository")
    .action(() => {
      console.log("repo delete: not yet implemented");
    });
}
