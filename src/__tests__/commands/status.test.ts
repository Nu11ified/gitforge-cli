import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

import { handleStatus } from "../../commands/status";
import { writeAuth, writeConfig } from "../../config";

describe("status command", () => {
  let tempDir: string;
  let originalXdg: string | undefined;
  let originalToken: string | undefined;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "gitforge-status-cmd-"));
    originalXdg = process.env.XDG_CONFIG_HOME;
    originalToken = process.env.GITFORGE_TOKEN;
    process.env.XDG_CONFIG_HOME = tempDir;
    delete process.env.GITFORGE_TOKEN;
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

  it("shows auth info when token exists via stored auth", async () => {
    writeAuth({ token: "gf_test_pat_abc123" });
    writeConfig({ endpoint: "http://localhost:3001" });

    const lines: string[] = [];
    const log = (msg: string) => lines.push(msg);

    const mockFetch = async () => ({
      data: [{ id: "r1", name: "repo-1" }],
      total: 5,
    });

    await handleStatus(log, mockFetch);

    const output = lines.join("\n");
    expect(output).toMatch(/authenticated/i);
    expect(output).toContain("gf_tes"); // masked token prefix
    expect(output).toContain("localhost:3001");
  });

  it("shows auth info when token exists via env var", async () => {
    process.env.GITFORGE_TOKEN = "gf_env_token_xyz";
    writeConfig({ endpoint: "https://forge.example.com" });

    const lines: string[] = [];
    const log = (msg: string) => lines.push(msg);

    const mockFetch = async () => ({
      data: [],
      total: 0,
    });

    await handleStatus(log, mockFetch);

    const output = lines.join("\n");
    expect(output).toMatch(/authenticated/i);
    expect(output).toContain("env");
    expect(output).toContain("forge.example.com");
  });

  it("shows 'not authenticated' when no token", async () => {
    writeConfig({ endpoint: "http://localhost:3001" });

    const lines: string[] = [];
    const log = (msg: string) => lines.push(msg);

    await handleStatus(log);

    const output = lines.join("\n");
    expect(output).toMatch(/not authenticated/i);
    expect(output).toContain("localhost:3001");
  });

  it("shows connectivity success with repo count", async () => {
    writeAuth({ token: "gf_test_connected" });
    writeConfig({ endpoint: "http://localhost:3001" });

    const lines: string[] = [];
    const log = (msg: string) => lines.push(msg);

    const mockFetch = async () => ({
      data: [{ id: "r1" }],
      total: 42,
    });

    await handleStatus(log, mockFetch);

    const output = lines.join("\n");
    expect(output).toContain("42");
    expect(output).toMatch(/connected|reachable|repos/i);
  });

  it("handles connectivity failure gracefully", async () => {
    writeAuth({ token: "gf_test_fail" });
    writeConfig({ endpoint: "http://localhost:3001" });

    const lines: string[] = [];
    const log = (msg: string) => lines.push(msg);

    const mockFetch = async () => {
      throw new Error("Connection refused");
    };

    // Should NOT throw -- status handles errors gracefully
    await handleStatus(log, mockFetch);

    const output = lines.join("\n");
    expect(output).toMatch(/not reachable|unreachable|failed|error/i);
  });
});
