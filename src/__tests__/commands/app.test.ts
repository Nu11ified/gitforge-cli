import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

import {
  handleAppCreate,
  handleAppList,
  handleAppToken,
} from "../../commands/app";
import { writeAuth, writeConfig } from "../../config";

describe("app commands", () => {
  let tempDir: string;
  let originalXdg: string | undefined;
  let originalToken: string | undefined;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "gitforge-app-cmd-"));
    originalXdg = process.env.XDG_CONFIG_HOME;
    originalToken = process.env.GITFORGE_TOKEN;
    process.env.XDG_CONFIG_HOME = tempDir;
    delete process.env.GITFORGE_TOKEN;
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
    it("prints app info on success", async () => {
      const lines: string[] = [];
      const log = (msg: string) => lines.push(msg);

      const mockFetch = async () => ({
        id: "app-uuid-1",
        name: "My CI Bot",
        clientId: "gf_app_abc123",
        clientSecret: "secret_xyz",
        createdBy: "user-1",
        createdAt: "2026-03-28T00:00:00.000Z",
        updatedAt: "2026-03-28T00:00:00.000Z",
      });

      await handleAppCreate({ name: "My CI Bot" }, log, mockFetch);

      const output = lines.join("\n");
      expect(output).toContain("My CI Bot");
      expect(output).toContain("app-uuid-1");
      expect(output).toContain("gf_app_abc123");
    });

    it("sends correct name to API", async () => {
      let capturedPath: string | undefined;
      let capturedOpts: any;

      const mockFetch = async (path: string, opts: any) => {
        capturedPath = path;
        capturedOpts = opts;
        return {
          id: "a1",
          name: "test-app",
          clientId: "c1",
          createdAt: "",
          updatedAt: "",
        };
      };

      await handleAppCreate({ name: "test-app" }, () => {}, mockFetch);

      expect(capturedPath).toBe("/admin/apps");
      expect(capturedOpts.method).toBe("POST");
      expect(capturedOpts.body.name).toBe("test-app");
    });
  });

  describe("list", () => {
    it("formats table output", async () => {
      const lines: string[] = [];
      const log = (msg: string) => lines.push(msg);

      const mockFetch = async () => [
        {
          id: "app-1",
          name: "CI Bot",
          clientId: "gf_app_1",
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-01T00:00:00.000Z",
        },
        {
          id: "app-2",
          name: "Deploy Bot",
          clientId: "gf_app_2",
          createdAt: "2026-03-15T00:00:00.000Z",
          updatedAt: "2026-03-15T00:00:00.000Z",
        },
      ];

      await handleAppList({ format: "table" }, log, mockFetch);

      const output = lines.join("\n");
      expect(output).toContain("CI Bot");
      expect(output).toContain("Deploy Bot");
      expect(output).toContain("app-1");
      expect(output).toContain("app-2");
    });

    it("formats JSON output", async () => {
      const apps = [
        {
          id: "app-1",
          name: "CI Bot",
          clientId: "gf_app_1",
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-01T00:00:00.000Z",
        },
      ];

      const lines: string[] = [];
      const mockFetch = async () => apps;

      await handleAppList({ format: "json" }, (msg) => lines.push(msg), mockFetch);

      const output = lines.join("\n");
      const parsed = JSON.parse(output);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].name).toBe("CI Bot");
    });

    it("calls correct API path", async () => {
      let capturedPath: string | undefined;

      const mockFetch = async (path: string) => {
        capturedPath = path;
        return [];
      };

      await handleAppList({ format: "table" }, () => {}, mockFetch);
      expect(capturedPath).toBe("/admin/apps");
    });
  });

  describe("token", () => {
    it("prints installation token on success", async () => {
      const lines: string[] = [];
      const log = (msg: string) => lines.push(msg);

      const mockFetch = async () => ({
        token: "ghs_install_token_abc123",
        expiresAt: "2026-03-28T01:00:00.000Z",
      });

      await handleAppToken(
        { appId: "app-1", installId: "inst-1" },
        log,
        mockFetch,
      );

      const output = lines.join("\n");
      expect(output).toContain("ghs_install_token_abc123");
    });

    it("calls correct API path", async () => {
      let capturedPath: string | undefined;
      let capturedOpts: any;

      const mockFetch = async (path: string, opts: any) => {
        capturedPath = path;
        capturedOpts = opts;
        return { token: "t1", expiresAt: "" };
      };

      await handleAppToken(
        { appId: "app-uuid", installId: "inst-uuid" },
        () => {},
        mockFetch,
      );

      expect(capturedPath).toBe("/admin/apps/app-uuid/installations/inst-uuid/token");
      expect(capturedOpts.method).toBe("POST");
    });
  });

  describe("error handling", () => {
    it("propagates API errors from create", async () => {
      const mockFetch = async () => {
        throw new Error("Only admins can manage apps");
      };

      await expect(
        handleAppCreate({ name: "test" }, () => {}, mockFetch),
      ).rejects.toThrow("Only admins can manage apps");
    });

    it("propagates API errors from token", async () => {
      const mockFetch = async () => {
        throw new Error("Installation not found");
      };

      await expect(
        handleAppToken(
          { appId: "a", installId: "b" },
          () => {},
          mockFetch,
        ),
      ).rejects.toThrow("Installation not found");
    });
  });
});
