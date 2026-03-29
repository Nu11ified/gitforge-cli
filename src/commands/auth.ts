import type { Command } from "commander";
import { writeAuth, writeConfig, clearAuth } from "../config";
import { resolveToken } from "../auth";

type Logger = (msg: string) => void;

interface LoginOptions {
  token: string;
  endpoint?: string;
}

/**
 * Handle `gitforge auth login --token <pat>`.
 * Validates token, stores it, and optionally saves endpoint.
 */
export function handleAuthLogin(
  opts: LoginOptions,
  log: Logger = console.log,
): void {
  if (!opts.token || opts.token.length === 0) {
    throw new Error("Token is required. Use --token <pat> to provide one.");
  }

  writeAuth({ token: opts.token });

  if (opts.endpoint) {
    writeConfig({ endpoint: opts.endpoint });
  }

  log("Authenticated successfully.");
}

/**
 * Handle `gitforge auth status`.
 * Shows whether the user is authenticated and a masked token.
 */
export function handleAuthStatus(log: Logger = console.log): void {
  const token = resolveToken(undefined);

  if (token) {
    const masked = token.substring(0, 6) + "...";
    log(`Authenticated (token: ${masked})`);
  } else {
    log("Not authenticated. Run `gitforge auth login --token <pat>` to log in.");
  }
}

/**
 * Handle `gitforge auth token`.
 * Prints raw token to stdout for piping. Returns exit code.
 */
export function handleAuthToken(log: Logger = console.log): number {
  const token = resolveToken(undefined);

  if (token) {
    log(token);
    return 0;
  }

  log("No token found. Run `gitforge auth login` or set GITFORGE_TOKEN.");
  return 1;
}

/**
 * Handle `gitforge auth logout`.
 * Clears stored authentication.
 */
export function handleAuthLogout(log: Logger = console.log): void {
  clearAuth();
  log("Logged out.");
}

/**
 * Register auth subcommands with commander.
 */
export function registerAuthCommands(program: Command): void {
  const auth = program
    .command("auth")
    .description("Authenticate with a GitForge instance");

  auth
    .command("login")
    .description("Log in to a GitForge instance")
    .requiredOption("--token <pat>", "Personal access token")
    .option("--endpoint <url>", "GitForge API endpoint")
    .action((opts) => {
      handleAuthLogin(opts);
    });

  auth
    .command("status")
    .description("Show current authentication status")
    .action(() => {
      handleAuthStatus();
    });

  auth
    .command("token")
    .description("Print the current authentication token")
    .action(() => {
      const code = handleAuthToken();
      if (code !== 0) {
        process.exit(code);
      }
    });

  auth
    .command("logout")
    .description("Log out of the current GitForge instance")
    .action(() => {
      handleAuthLogout();
    });
}
