import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

import { resolveToken, requireToken } from "../auth";
import { writeAuth } from "../config";

describe("auth module", () => {
  let tempDir: string;
  let originalXdg: string | undefined;
  let originalToken: string | undefined;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "gitforge-auth-test-"));
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

  describe("resolveToken", () => {
    it("returns flag token when provided (highest priority)", () => {
      process.env.GITFORGE_TOKEN = "env_token";
      writeAuth({ token: "stored_token" });
      const token = resolveToken("flag_token");
      expect(token).toBe("flag_token");
    });

    it("returns GITFORGE_TOKEN env when no flag (second priority)", () => {
      process.env.GITFORGE_TOKEN = "env_token";
      writeAuth({ token: "stored_token" });
      const token = resolveToken(undefined);
      expect(token).toBe("env_token");
    });

    it("returns stored token when no flag or env (third priority)", () => {
      writeAuth({ token: "stored_token" });
      const token = resolveToken(undefined);
      expect(token).toBe("stored_token");
    });

    it("returns null when nothing available", () => {
      const token = resolveToken(undefined);
      expect(token).toBeNull();
    });

    it("skips empty string flag token", () => {
      process.env.GITFORGE_TOKEN = "env_token";
      const token = resolveToken("");
      expect(token).toBe("env_token");
    });

    it("skips empty string env token", () => {
      process.env.GITFORGE_TOKEN = "";
      writeAuth({ token: "stored_token" });
      const token = resolveToken(undefined);
      expect(token).toBe("stored_token");
    });
  });

  describe("requireToken", () => {
    it("returns token when available", () => {
      const token = requireToken("my_token");
      expect(token).toBe("my_token");
    });

    it("throws when no token available", () => {
      expect(() => requireToken(undefined)).toThrow(
        /authentication required/i
      );
    });
  });
});
