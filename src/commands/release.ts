import type { Command } from "commander";
import { apiFetch } from "../api";

type Logger = (msg: string) => void;

/** Fetch function signature for dependency injection in tests. */
type FetchFn = (path: string, opts?: any) => Promise<any>;

/** Create a fetch function that forwards the given token to apiFetch. */
function boundFetch(token: string | undefined): FetchFn {
  if (!token) return apiFetch;
  return (path, opts) => apiFetch(path, { ...opts, token });
}

interface ReleaseNotesOpts {
  repo: string;
  base: string;
  head: string;
}

/**
 * Handle `gitforge release notes --repo <id> --base <ref> --head <ref>`.
 */
export async function handleReleaseNotes(
  opts: ReleaseNotesOpts,
  log: Logger = console.log,
  fetchFn: FetchFn = apiFetch,
): Promise<void> {
  const params = new URLSearchParams({ base: opts.base, head: opts.head });
  const result = await fetchFn(
    `/repos/${opts.repo}/releases/notes?${params.toString()}`,
  );

  // Print the rendered markdown to stdout
  log(result.markdown);
}

/**
 * Register release subcommands with commander.
 */
export function registerReleaseCommands(program: Command): void {
  const release = program
    .command("release")
    .description("Manage releases");

  release
    .command("notes")
    .description("Generate release notes from conventional commits")
    .requiredOption("--repo <id>", "Repository ID")
    .requiredOption("--base <ref>", "Base tag or ref (e.g. v0.1.0)")
    .requiredOption("--head <ref>", "Head tag or ref (e.g. v0.2.0)")
    .action(async (opts) => {
      try {
        const token = program.opts().token;
        await handleReleaseNotes(opts, console.log, boundFetch(token));
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });
}
