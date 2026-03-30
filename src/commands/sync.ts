import type { Command } from "commander";
import { apiFetch } from "../api";

type Logger = (msg: string) => void;

/** Fetch function signature for dependency injection in tests. */
type FetchFn = (path: string, opts?: any) => Promise<any>;

// ---------------------------------------------------------------------------
// URL detection (lightweight — mirrors the API's url-detect logic)
// ---------------------------------------------------------------------------

interface DetectedRepo {
  platform: string;
  owner: string;
  name: string;
  cloneUrl: string;
}

const KNOWN_HOSTS: Record<string, string> = {
  "github.com": "github",
  "gitlab.com": "gitlab",
  "bitbucket.org": "bitbucket",
  "codeberg.org": "codeberg",
};

const PATH_STOP_SEGMENTS = new Set([
  "tree", "blob", "commit", "commits", "pulls", "pull", "issues",
  "actions", "releases", "tags", "branches", "settings", "wiki",
  "compare", "merge_requests", "pipelines", "-", "raw", "edit",
  "archive", "refs",
]);

function detectRepo(url: string): DetectedRepo | null {
  if (!url || !url.startsWith("http://") && !url.startsWith("https://")) return null;

  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }

  const hostname = parsed.hostname.toLowerCase();
  const hostWithPort = parsed.port ? `${hostname}:${parsed.port}` : hostname;
  const baseUrl = `${parsed.protocol}//${hostWithPort}`;

  let rawPath = parsed.pathname.replace(/\/+$/, "");
  if (rawPath.endsWith(".git")) rawPath = rawPath.slice(0, -4);

  const segments = rawPath.split("/").filter(Boolean);
  if (segments.length < 2) return null;

  const platform = KNOWN_HOSTS[hostname] ?? "gitea";

  let stopIdx = -1;
  for (let i = 0; i < segments.length; i++) {
    if (PATH_STOP_SEGMENTS.has(segments[i])) { stopIdx = i; break; }
  }

  const repoSegments = stopIdx >= 0 ? segments.slice(0, stopIdx) : segments;
  if (repoSegments.length < 2) return null;

  let owner: string;
  let name: string;

  if (platform === "gitlab") {
    name = repoSegments[repoSegments.length - 1];
    owner = repoSegments.slice(0, -1).join("/");
  } else {
    owner = repoSegments[0];
    name = repoSegments[1];
  }

  return {
    platform,
    owner,
    name,
    cloneUrl: `${baseUrl}/${platform === "gitlab" ? `${owner}/${name}` : `${owner}/${name}`}.git`,
  };
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/**
 * Handle `gitforge sync <url>`.
 */
export async function handleSyncUrl(
  url: string,
  log: Logger = console.log,
  fetchFn: FetchFn = apiFetch,
): Promise<void> {
  const detected = detectRepo(url);
  if (!detected) {
    log("Error: Could not detect a repository from the provided URL.");
    log("Please provide a valid HTTPS URL to a Git repository.");
    return;
  }

  try {
    const result = await fetchFn("/search/external/sync", {
      method: "POST",
      body: {
        platform: detected.platform,
        owner: detected.owner,
        name: detected.name,
        cloneUrl: detected.cloneUrl,
      },
    });

    log("Repository synced successfully:");
    log(`  ID:     ${result.repo.id}`);
    log(`  Name:   ${result.repo.name}`);
    log(`  Mirror: ${result.mirror.id}`);
  } catch (err: any) {
    if (err.status === 409 || err.body?.repoId) {
      const repoId = err.body?.repoId ?? "unknown";
      log(`Repository already synced (repo ID: ${repoId})`);
      return;
    }
    log(`Error: Failed to sync repository — ${err.message}`);
  }
}

/**
 * Handle `gitforge sync --search "query"`.
 *
 * If `pick` is provided, syncs the Nth result (1-based) immediately.
 * Otherwise prints the search results for the user to choose from.
 */
export async function handleSyncSearch(
  query: string,
  pick: number | undefined,
  log: Logger = console.log,
  fetchFn: FetchFn = apiFetch,
): Promise<void> {
  let results: any[];

  try {
    const data = await fetchFn(`/search/external?q=${encodeURIComponent(query)}&limit=20`);
    results = data.results ?? [];
  } catch (err: any) {
    log(`Error: Failed to search — ${err.message}`);
    return;
  }

  if (results.length === 0) {
    log("No results found.");
    return;
  }

  // Print numbered results
  log(`Search results for "${query}":\n`);
  results.forEach((r: any, i: number) => {
    const stars = r.stars ? ` (${r.stars} stars)` : "";
    const lang = r.language ? ` [${r.language}]` : "";
    const desc = r.description ? ` — ${r.description}` : "";
    log(`  ${i + 1}. ${r.fullName}${lang}${stars}${desc}`);
  });

  // If --pick was provided, sync that result
  if (pick !== undefined) {
    const idx = pick - 1;
    if (idx < 0 || idx >= results.length) {
      log(`\nError: Invalid pick ${pick}. Must be 1-${results.length}.`);
      return;
    }

    const selected = results[idx];
    log(`\nSyncing ${selected.fullName}...`);

    try {
      const syncResult = await fetchFn("/search/external/sync", {
        method: "POST",
        body: {
          platform: selected.platform,
          owner: selected.owner,
          name: selected.name,
          cloneUrl: selected.cloneUrl,
          description: selected.description,
          defaultBranch: selected.defaultBranch,
        },
      });

      log("Repository synced successfully:");
      log(`  ID:     ${syncResult.repo.id}`);
      log(`  Name:   ${syncResult.repo.name}`);
      log(`  Mirror: ${syncResult.mirror.id}`);
    } catch (err: any) {
      if (err.status === 409 || err.body?.repoId) {
        log(`Repository already synced (repo ID: ${err.body?.repoId ?? "unknown"})`);
        return;
      }
      log(`Error: Failed to sync — ${err.message}`);
    }
  } else {
    log(`\nUse --pick <number> to sync a result, e.g.: gitforge sync --search "${query}" --pick 1`);
  }
}

// ---------------------------------------------------------------------------
// Commander registration
// ---------------------------------------------------------------------------

/** Create a fetch function that forwards the given token to apiFetch. */
function boundFetch(token: string | undefined): FetchFn {
  if (!token) return apiFetch;
  return (path, opts) => apiFetch(path, { ...opts, token });
}

export function registerSyncCommand(program: Command): void {
  program
    .command("sync [url]")
    .description("Sync an external repository to GitForge")
    .option("--search <query>", "Search for repos instead of syncing by URL")
    .option("--pick <n>", "Pick the Nth search result to sync", parseInt)
    .action(async (url, opts) => {
      try {
        const token = program.opts().token;
        const fetchFn = boundFetch(token);

        if (opts.search) {
          await handleSyncSearch(opts.search, opts.pick, console.log, fetchFn);
        } else if (url) {
          await handleSyncUrl(url, console.log, fetchFn);
        } else {
          console.error("Error: Provide a URL or use --search <query>");
          process.exit(1);
        }
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });
}
