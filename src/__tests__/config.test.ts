import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

import {
  getConfigDir,
  readConfig,
  writeConfig,
  readAuth,
  writeAuth,
  clearAuth,
} from "../config";

describe("config module", () => {
  let tempDir: string;
  let originalXdg: string | undefined;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "gitforge-test-"));
    originalXdg = process.env.XDG_CONFIG_HOME;
    process.env.XDG_CONFIG_HOME = tempDir;
  });

  afterEach(() => {
    if (originalXdg === undefined) {
      delete process.env.XDG_CONFIG_HOME;
    } else {
      process.env.XDG_CONFIG_HOME = originalXdg;
    }
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe("getConfigDir", () => {
    it("returns XDG_CONFIG_HOME/gitforge", () => {
      const dir = getConfigDir();
      expect(dir).toBe(join(tempDir, "gitforge"));
    });
  });

  describe("readConfig", () => {
    it("returns defaults when no file exists", () => {
      const config = readConfig();
      expect(config.endpoint).toBe("http://localhost:3001");
      expect(config.defaultVisibility).toBe("private");
      expect(config.outputFormat).toBe("table");
    });
  });

  describe("writeConfig + readConfig", () => {
    it("round-trips values", () => {
      writeConfig({ endpoint: "https://forge.example.com", outputFormat: "json" });
      const config = readConfig();
      expect(config.endpoint).toBe("https://forge.example.com");
      expect(config.outputFormat).toBe("json");
      // default should still be present for unwritten keys
      expect(config.defaultVisibility).toBe("private");
    });

    it("creates directory if missing", () => {
      const configDir = getConfigDir();
      expect(existsSync(configDir)).toBe(false);
      writeConfig({ endpoint: "https://test.example.com" });
      expect(existsSync(configDir)).toBe(true);
    });
  });

  describe("readAuth", () => {
    it("returns { token: null } when no file exists", () => {
      const auth = readAuth();
      expect(auth.token).toBeNull();
    });
  });

  describe("writeAuth + readAuth", () => {
    it("round-trips token", () => {
      writeAuth({ token: "gf_test_token_abc123" });
      const auth = readAuth();
      expect(auth.token).toBe("gf_test_token_abc123");
    });
  });

  describe("clearAuth", () => {
    it("removes stored token", () => {
      writeAuth({ token: "gf_to_clear" });
      clearAuth();
      const auth = readAuth();
      expect(auth.token).toBeNull();
    });
  });
});
