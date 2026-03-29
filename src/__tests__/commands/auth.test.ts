import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

import {
  handleAuthLogin,
  handleAuthStatus,
  handleAuthToken,
  handleAuthLogout,
} from "../../commands/auth";
import { readAuth, writeAuth } from "../../config";

describe("auth commands", () => {
  let tempDir: string;
  let originalXdg: string | undefined;
  let originalToken: string | undefined;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "gitforge-auth-cmd-"));
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

  describe("login", () => {
    it("stores token and prints success", () => {
      const lines: string[] = [];
      const log = (msg: string) => lines.push(msg);

      handleAuthLogin({ token: "gf_test_abc123" }, log);

      // Token should be stored
      const auth = readAuth();
      expect(auth.token).toBe("gf_test_abc123");

      // Should print success
      expect(lines.some((l) => /authenticated/i.test(l))).toBe(true);
    });

    it("also saves endpoint when provided", () => {
      const lines: string[] = [];
      const log = (msg: string) => lines.push(msg);

      handleAuthLogin(
        { token: "gf_test_abc123", endpoint: "https://forge.example.com" },
        log,
      );

      // Token should be stored
      const auth = readAuth();
      expect(auth.token).toBe("gf_test_abc123");

      // Endpoint should be stored in config
      const { readConfig } = require("../../config");
      const config = readConfig();
      expect(config.endpoint).toBe("https://forge.example.com");
    });

    it("throws when token is empty", () => {
      const log = (_msg: string) => {};
      expect(() => handleAuthLogin({ token: "" }, log)).toThrow(/token/i);
    });
  });

  describe("status", () => {
    it("shows masked token when authenticated", () => {
      writeAuth({ token: "gf_test_secret_token_value" });

      const lines: string[] = [];
      const log = (msg: string) => lines.push(msg);

      handleAuthStatus(log);

      const output = lines.join("\n");
      expect(output).toMatch(/authenticated/i);
      // Should show first 6 chars masked
      expect(output).toContain("gf_tes");
      expect(output).toContain("...");
      // Should NOT show the full token
      expect(output).not.toContain("gf_test_secret_token_value");
    });

    it("shows not authenticated when no token", () => {
      const lines: string[] = [];
      const log = (msg: string) => lines.push(msg);

      handleAuthStatus(log);

      const output = lines.join("\n");
      expect(output).toMatch(/not authenticated/i);
      // Should hint to run login
      expect(output).toMatch(/login/i);
    });
  });

  describe("token", () => {
    it("prints raw token when authenticated", () => {
      writeAuth({ token: "gf_raw_token_12345" });

      const lines: string[] = [];
      const log = (msg: string) => lines.push(msg);

      const exitCode = handleAuthToken(log);

      expect(lines).toEqual(["gf_raw_token_12345"]);
      expect(exitCode).toBe(0);
    });

    it("returns exit code 1 when no token", () => {
      const lines: string[] = [];
      const log = (msg: string) => lines.push(msg);

      const exitCode = handleAuthToken(log);

      expect(exitCode).toBe(1);
    });
  });

  describe("logout", () => {
    it("clears stored token and prints confirmation", () => {
      writeAuth({ token: "gf_to_be_cleared" });

      const lines: string[] = [];
      const log = (msg: string) => lines.push(msg);

      handleAuthLogout(log);

      // Token should be cleared
      const auth = readAuth();
      expect(auth.token).toBeNull();

      // Should print confirmation
      expect(lines.some((l) => /logged out/i.test(l))).toBe(true);
    });
  });
});
