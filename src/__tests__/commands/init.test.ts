import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

import { handleInit } from "../../commands/init";
import { readConfig, readAuth } from "../../config";

describe("init command", () => {
  let tempDir: string;
  let originalXdg: string | undefined;
  let originalToken: string | undefined;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "gitforge-init-cmd-"));
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

  it("saves config and auth with provided flags", async () => {
    const lines: string[] = [];
    const log = (msg: string) => lines.push(msg);

    const mockFetch = async () => ({
      data: [],
      total: 0,
    });

    await handleInit(
      { endpoint: "https://forge.example.com", token: "gf_init_test_123" },
      log,
      mockFetch,
    );

    const config = readConfig();
    expect(config.endpoint).toBe("https://forge.example.com");

    const auth = readAuth();
    expect(auth.token).toBe("gf_init_test_123");
  });

  it("verifies connectivity after saving", async () => {
    const lines: string[] = [];
    const log = (msg: string) => lines.push(msg);
    let fetchCalled = false;

    const mockFetch = async (path: string) => {
      fetchCalled = true;
      return { data: [{ id: "r1" }], total: 3 };
    };

    await handleInit(
      { endpoint: "http://localhost:3001", token: "gf_verify_test" },
      log,
      mockFetch,
    );

    expect(fetchCalled).toBe(true);

    const output = lines.join("\n");
    expect(output).toMatch(/success|connected|verified/i);
  });

  it("uses default endpoint when not provided", async () => {
    const lines: string[] = [];
    const log = (msg: string) => lines.push(msg);

    const mockFetch = async () => ({
      data: [],
      total: 0,
    });

    await handleInit(
      { token: "gf_default_ep" },
      log,
      mockFetch,
    );

    const config = readConfig();
    expect(config.endpoint).toBe("http://localhost:3001");

    const auth = readAuth();
    expect(auth.token).toBe("gf_default_ep");
  });

  it("handles connection failure gracefully", async () => {
    const lines: string[] = [];
    const log = (msg: string) => lines.push(msg);

    const mockFetch = async () => {
      throw new Error("Connection refused");
    };

    // Should NOT throw -- init handles errors gracefully and still saves config
    await handleInit(
      { endpoint: "http://localhost:9999", token: "gf_fail_test" },
      log,
      mockFetch,
    );

    // Config and auth should still be saved
    const config = readConfig();
    expect(config.endpoint).toBe("http://localhost:9999");

    const auth = readAuth();
    expect(auth.token).toBe("gf_fail_test");

    const output = lines.join("\n");
    expect(output).toMatch(/saved|configured/i);
    expect(output).toMatch(/warning|failed|not reachable|could not/i);
  });

  it("prints next steps after successful init", async () => {
    const lines: string[] = [];
    const log = (msg: string) => lines.push(msg);

    const mockFetch = async () => ({
      data: [],
      total: 0,
    });

    await handleInit(
      { endpoint: "http://localhost:3001", token: "gf_next_steps" },
      log,
      mockFetch,
    );

    const output = lines.join("\n");
    // Should hint at what to do next
    expect(output).toMatch(/repo|status|gitforge/i);
  });
});
