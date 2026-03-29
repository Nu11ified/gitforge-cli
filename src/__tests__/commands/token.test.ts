import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

import {
  handleTokenCreate,
  handleTokenList,
  handleTokenRevoke,
} from "../../commands/token";
import { writeAuth, writeConfig } from "../../config";

describe("token commands", () => {
  let tempDir: string;
  let originalXdg: string | undefined;
  let originalToken: string | undefined;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "gitforge-token-cmd-"));
    originalXdg = process.env.XDG_CONFIG_HOME;
    originalToken = process.env.GITFORGE_TOKEN;
    process.env.XDG_CONFIG_HOME = tempDir;
    delete process.env.GITFORGE_TOKEN;
    // Seed auth + config so requireToken doesn't throw
    writeAuth({ token: "gf_test_token_123" });
    writeConfig({ endpoint: "http://localhost:3001" });
  });

  afterEach(() => {
    if (originalXdg === undefined) {
      delete process.env.XDG_CONFIG_HOME;
    } else {
      process.env.XDG_CONFIG_HOME = originalXdg;
    }
    if (originalToken === undefined) {
      delete process.env.GITFORGE_TOKEN;
    } else {
      process.env.GITFORGE_TOKEN = originalToken;
    }
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe("create", () => {
    it("prints new token on success", async () => {
      const lines: string[] = [];
      const log = (msg: string) => lines.push(msg);

      const mockFetch = async () => ({
        token: "gf_new_pat_abc123",
        pat: {
          id: "pat-uuid-1",
          name: "ci-token",
          scopes: ["repo:read", "repo:write"],
          createdAt: "2026-03-28T00:00:00.000Z",
        },
      });

      await handleTokenCreate(
        { name: "ci-token", scopes: "repo:read,repo:write" },
        log,
        mockFetch,
      );

      const output = lines.join("\n");
      expect(output).toContain("gf_new_pat_abc123");
      expect(output).toContain("ci-token");
    });

    it("sends correct name and scopes to API", async () => {
      let capturedPath: string | undefined;
      let capturedOpts: any;

      const mockFetch = async (path: string, opts: any) => {
        capturedPath = path;
        capturedOpts = opts;
        return {
          token: "gf_xyz",
          pat: { id: "p1", name: "test", scopes: ["repo:read"], createdAt: "" },
        };
      };

      await handleTokenCreate(
        { name: "my-token", scopes: "repo:read" },
        () => {},
        mockFetch,
      );

      expect(capturedPath).toBe("/auth/pats");
      expect(capturedOpts.method).toBe("POST");
      expect(capturedOpts.body.name).toBe("my-token");
      expect(capturedOpts.body.scopes).toEqual(["repo:read"]);
    });

    it("propagates API errors", async () => {
      const mockFetch = async () => {
        throw new Error("name is required");
      };

      await expect(
        handleTokenCreate({ name: "", scopes: "" }, () => {}, mockFetch),
      ).rejects.toThrow("name is required");
    });
  });

  describe("list", () => {
    it("formats table output", async () => {
      const lines: string[] = [];
      const log = (msg: string) => lines.push(msg);

      const mockFetch = async () => [
        {
          id: "pat-1",
          name: "ci-token",
          scopes: ["repo:read"],
          createdAt: "2026-03-01T00:00:00.000Z",
          lastUsedAt: null,
        },
        {
          id: "pat-2",
          name: "deploy-key",
          scopes: ["repo:read", "repo:write"],
          createdAt: "2026-03-15T00:00:00.000Z",
          lastUsedAt: "2026-03-20T00:00:00.000Z",
        },
      ];

      await handleTokenList({ format: "table" }, log, mockFetch);

      const output = lines.join("\n");
      expect(output).toContain("ci-token");
      expect(output).toContain("deploy-key");
      expect(output).toContain("pat-1");
      expect(output).toContain("pat-2");
    });

    it("formats JSON output", async () => {
      const pats = [
        {
          id: "pat-1",
          name: "ci-token",
          scopes: ["repo:read"],
          createdAt: "2026-03-01T00:00:00.000Z",
          lastUsedAt: null,
        },
      ];

      const lines: string[] = [];
      const mockFetch = async () => pats;

      await handleTokenList({ format: "json" }, (msg) => lines.push(msg), mockFetch);

      const output = lines.join("\n");
      const parsed = JSON.parse(output);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].name).toBe("ci-token");
    });

    it("calls correct API path", async () => {
      let capturedPath: string | undefined;

      const mockFetch = async (path: string) => {
        capturedPath = path;
        return [];
      };

      await handleTokenList({ format: "table" }, () => {}, mockFetch);
      expect(capturedPath).toBe("/auth/pats");
    });
  });

  describe("revoke", () => {
    it("prints confirmation on success", async () => {
      const lines: string[] = [];
      const log = (msg: string) => lines.push(msg);

      const mockFetch = async () => null;

      await handleTokenRevoke("pat-uuid-1", log, mockFetch);

      const output = lines.join("\n");
      expect(output).toMatch(/revoked/i);
      expect(output).toContain("pat-uuid-1");
    });

    it("calls correct API path with DELETE", async () => {
      let capturedPath: string | undefined;
      let capturedOpts: any;

      const mockFetch = async (path: string, opts: any) => {
        capturedPath = path;
        capturedOpts = opts;
        return null;
      };

      await handleTokenRevoke("pat-uuid-1", () => {}, mockFetch);

      expect(capturedPath).toBe("/auth/pats/pat-uuid-1");
      expect(capturedOpts.method).toBe("DELETE");
    });

    it("propagates API errors", async () => {
      const mockFetch = async () => {
        throw new Error("PAT not found");
      };

      await expect(
        handleTokenRevoke("bad-id", () => {}, mockFetch),
      ).rejects.toThrow("PAT not found");
    });
  });
});
