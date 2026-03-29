import type { Command } from "commander";

export function registerAuthCommands(program: Command): void {
  const auth = program
    .command("auth")
    .description("Authenticate with a GitForge instance");

  auth
    .command("login")
    .description("Log in to a GitForge instance")
    .action(() => {
      console.log("auth login: not yet implemented");
    });

  auth
    .command("status")
    .description("Show current authentication status")
    .action(() => {
      console.log("auth status: not yet implemented");
    });

  auth
    .command("token")
    .description("Print the current authentication token")
    .action(() => {
      console.log("auth token: not yet implemented");
    });

  auth
    .command("logout")
    .description("Log out of the current GitForge instance")
    .action(() => {
      console.log("auth logout: not yet implemented");
    });
}
