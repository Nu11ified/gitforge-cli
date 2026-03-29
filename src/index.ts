import { Command } from "commander";
import { registerAuthCommands } from "./commands/auth";
import { registerRepoCommands } from "./commands/repo";
import { registerTokenCommands } from "./commands/token";
import { registerAppCommands } from "./commands/app";
import { registerStatusCommand } from "./commands/status";
import { registerInitCommand } from "./commands/init";
import { registerBillingCommands } from "./commands/billing";
import { registerReleaseCommands } from "./commands/release";

const program = new Command();

program
  .name("gitforge")
  .description("Terminal-native management tool for GitForge")
  .version("0.0.1")
  .option("--token <pat>", "API token (overrides env and stored auth)");

registerAuthCommands(program);
registerRepoCommands(program);
registerTokenCommands(program);
registerAppCommands(program);
registerStatusCommand(program);
registerInitCommand(program);
registerBillingCommands(program);

program.parseAsync(process.argv).catch((err) => {
  console.error(err.message);
  process.exit(1);
});
