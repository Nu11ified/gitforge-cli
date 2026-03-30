import { describe, it, expect, beforeEach } from "bun:test";
import {
  handleSyncUrl,
  handleSyncSearch,
} from "../../commands/sync";

// ---------------------------------------------------------------------------
// Mock fetch helpers
// ---------------------------------------------------------------------------

type FetchFn = (path: string, opts?: any) => Promise<any>;

function createMockFetch(responses: Record<string, any> = {}): FetchFn {
  return async (path: string, opts?: any) => {
    const method = opts?.method ?? "GET";
    const key = `${method} ${path}`;

    // Check for exact match first, then prefix match
    if (responses[key] !== undefined) {
      const val = responses[key];
      if (val instanceof Error) throw val;
      return val;
    }

    // Match by path prefix for GET requests with query params
    for (const [k, v] of Object.entries(responses)) {
      if (path.startsWith(k.replace("GET ", "")) && method === "GET" && k.startsWith("GET ")) {
        if (v instanceof Error) throw v;
        return v;
      }
    }

    throw new Error(`Unexpected fetch: ${method} ${path}`);
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("sync commands", () => {
  describe("handleSyncUrl", () => {
    it("calls sync API with detected repo info", async () => {
      const lines: string[] = [];
      const log = (msg: string) => lines.push(msg);

      const fetchFn = createMockFetch({
        "POST /search/external/sync": {
          repo: { id: "repo-123", name: "facebook-react" },
          mirror: { id: "mirror-456" },
        },
      });

      await handleSyncUrl("https://github.com/facebook/react", log, fetchFn);

      expect(lines.some((l) => l.includes("repo-123"))).toBe(true);
      expect(lines.some((l) => l.includes("facebook-react"))).toBe(true);
    });

    it("prints error for invalid URL", async () => {
      const lines: string[] = [];
      const log = (msg: string) => lines.push(msg);

      const fetchFn = createMockFetch({});

      await handleSyncUrl("not-a-url", log, fetchFn);

      expect(lines.some((l) => l.toLowerCase().includes("invalid") || l.toLowerCase().includes("could not detect"))).toBe(true);
    });

    it("handles 409 duplicate and prints existing repo info", async () => {
      const lines: string[] = [];
      const log = (msg: string) => lines.push(msg);

      const fetchFn: FetchFn = async (path, opts) => {
        if (opts?.method === "POST" && path === "/search/external/sync") {
          const err = new Error("Repository already synced") as any;
          err.status = 409;
          err.body = { error: "Repository already synced", repoId: "existing-repo-id" };
          throw err;
        }
        throw new Error(`Unexpected: ${path}`);
      };

      await handleSyncUrl("https://github.com/facebook/react", log, fetchFn);

      expect(lines.some((l) => l.includes("already synced") || l.includes("existing-repo-id"))).toBe(true);
    });

    it("handles network failure gracefully", async () => {
      const lines: string[] = [];
      const log = (msg: string) => lines.push(msg);

      const fetchFn: FetchFn = async () => {
        throw new Error("ECONNREFUSED");
      };

      await handleSyncUrl("https://github.com/facebook/react", log, fetchFn);

      expect(lines.some((l) => l.toLowerCase().includes("error") || l.toLowerCase().includes("failed"))).toBe(true);
    });
  });

  describe("handleSyncSearch", () => {
    it("calls search API and prints results", async () => {
      const lines: string[] = [];
      const log = (msg: string) => lines.push(msg);

      const fetchFn = createMockFetch({
        "GET /search/external": {
          results: [
            {
              platform: "github",
              fullName: "facebook/react",
              description: "A JS library",
              stars: 200000,
              language: "JavaScript",
            },
            {
              platform: "github",
              fullName: "vuejs/vue",
              description: "Vue framework",
              stars: 195000,
              language: "TypeScript",
            },
          ],
        },
      });

      await handleSyncSearch("react", undefined, log, fetchFn);

      // Should list numbered results
      expect(lines.some((l) => l.includes("facebook/react"))).toBe(true);
      expect(lines.some((l) => l.includes("vuejs/vue"))).toBe(true);
    });

    it("syncs the picked result when --pick is provided", async () => {
      const lines: string[] = [];
      const log = (msg: string) => lines.push(msg);

      const fetchFn: FetchFn = async (path, opts) => {
        if (path.startsWith("/search/external") && !opts?.method) {
          return {
            results: [
              {
                platform: "github",
                platformId: "gh-1",
                fullName: "facebook/react",
                owner: "facebook",
                name: "react",
                description: "A JS library",
                stars: 200000,
                language: "JavaScript",
                cloneUrl: "https://github.com/facebook/react.git",
                defaultBranch: "main",
              },
              {
                platform: "github",
                platformId: "gh-2",
                fullName: "vuejs/vue",
                owner: "vuejs",
                name: "vue",
                description: "Vue framework",
                stars: 195000,
                language: "TypeScript",
                cloneUrl: "https://github.com/vuejs/vue.git",
                defaultBranch: "main",
              },
            ],
          };
        }
        if (opts?.method === "POST" && path === "/search/external/sync") {
          return {
            repo: { id: "repo-789", name: "facebook-react" },
            mirror: { id: "mirror-012" },
          };
        }
        throw new Error(`Unexpected: ${opts?.method ?? "GET"} ${path}`);
      };

      await handleSyncSearch("react", 1, log, fetchFn);

      // Should have synced the first result
      expect(lines.some((l) => l.includes("repo-789"))).toBe(true);
    });

    it("handles network failure", async () => {
      const lines: string[] = [];
      const log = (msg: string) => lines.push(msg);

      const fetchFn: FetchFn = async () => {
        throw new Error("ECONNREFUSED");
      };

      await handleSyncSearch("react", undefined, log, fetchFn);

      expect(lines.some((l) => l.toLowerCase().includes("error") || l.toLowerCase().includes("failed"))).toBe(true);
    });
  });
});
