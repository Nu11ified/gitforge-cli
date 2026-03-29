import { describe, it, expect, beforeEach } from "bun:test";
import type { Repo, PaginatedResponse } from "@gitforge/sdk";

import {
  handleRepoCreate,
  handleRepoList,
  handleRepoGet,
  handleRepoDelete,
} from "../../commands/repo";

/** Build a mock Repo object with sensible defaults. */
function mockRepo(overrides: Partial<Repo> = {}): Repo {
  return {
    id: "d361989f-a82e-4d64-aa30-25e6521e4f31",
    name: "my-repo",
    visibility: "private",
    defaultBranch: "main",
    lfsEnabled: false,
    isArchived: false,
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-28T12:00:00.000Z",
    ...overrides,
  };
}

/** Build a mock SDK client with stubs for repos resource. */
function mockClient(overrides: Record<string, unknown> = {}) {
  return {
    repos: {
      create: overrides.create ?? (async () => mockRepo()),
      list: overrides.list ?? (async () => ({
        data: [mockRepo()],
        total: 1,
        limit: 20,
        offset: 0,
        hasMore: false,
      })),
      get: overrides.get ?? (async () => mockRepo()),
      delete: overrides.delete ?? (async () => null),
    },
  } as any;
}

describe("repo commands", () => {
  describe("create", () => {
    it("prints created repo info", async () => {
      const lines: string[] = [];
      const log = (msg: string) => lines.push(msg);

      const created = mockRepo({ name: "new-repo", visibility: "public" });
      const client = mockClient({ create: async () => created });

      await handleRepoCreate(
        client,
        { name: "new-repo", visibility: "public" },
        log,
      );

      const output = lines.join("\n");
      expect(output).toContain("new-repo");
      expect(output).toContain(created.id);
      expect(output).toContain("public");
    });

    it("passes description to SDK", async () => {
      let capturedOpts: any;
      const client = mockClient({
        create: async (opts: any) => {
          capturedOpts = opts;
          return mockRepo({ name: opts.name, description: opts.description });
        },
      });

      const lines: string[] = [];
      await handleRepoCreate(
        client,
        { name: "desc-repo", description: "A test repo" },
        (msg) => lines.push(msg),
      );

      expect(capturedOpts.name).toBe("desc-repo");
      expect(capturedOpts.description).toBe("A test repo");
    });
  });

  describe("list", () => {
    it("outputs table format by default", async () => {
      const repos = [
        mockRepo({ name: "alpha", visibility: "public", updatedAt: "2026-03-20T00:00:00.000Z" }),
        mockRepo({ name: "beta", visibility: "private", updatedAt: "2026-03-25T00:00:00.000Z" }),
      ];
      const client = mockClient({
        list: async () => ({
          data: repos,
          total: 2,
          limit: 20,
          offset: 0,
          hasMore: false,
        } satisfies PaginatedResponse<Repo>),
      });

      const lines: string[] = [];
      await handleRepoList(client, { format: "table" }, (msg) => lines.push(msg));

      const output = lines.join("\n");
      expect(output).toContain("alpha");
      expect(output).toContain("beta");
      expect(output).toContain("public");
      expect(output).toContain("private");
    });

    it("outputs JSON format", async () => {
      const repos = [mockRepo({ name: "json-repo" })];
      const client = mockClient({
        list: async () => ({
          data: repos,
          total: 1,
          limit: 20,
          offset: 0,
          hasMore: false,
        }),
      });

      const lines: string[] = [];
      await handleRepoList(client, { format: "json" }, (msg) => lines.push(msg));

      const output = lines.join("\n");
      const parsed = JSON.parse(output);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].name).toBe("json-repo");
    });

    it("passes limit to SDK", async () => {
      let capturedOpts: any;
      const client = mockClient({
        list: async (opts: any) => {
          capturedOpts = opts;
          return { data: [], total: 0, limit: 5, offset: 0, hasMore: false };
        },
      });

      const lines: string[] = [];
      await handleRepoList(client, { format: "table", limit: 5 }, (msg) => lines.push(msg));

      expect(capturedOpts.limit).toBe(5);
    });
  });

  describe("get", () => {
    it("prints repo details", async () => {
      const repo = mockRepo({
        name: "detail-repo",
        description: "My detailed repo",
        visibility: "public",
        defaultBranch: "develop",
      });
      const client = mockClient({ get: async () => repo });

      const lines: string[] = [];
      await handleRepoGet(client, repo.id, (msg) => lines.push(msg));

      const output = lines.join("\n");
      expect(output).toContain("detail-repo");
      expect(output).toContain(repo.id);
      expect(output).toContain("public");
      expect(output).toContain("develop");
    });
  });

  describe("delete", () => {
    it("calls SDK delete and prints confirmation", async () => {
      let deletedId: string | undefined;
      const client = mockClient({
        delete: async (id: string) => {
          deletedId = id;
          return null;
        },
      });

      const lines: string[] = [];
      const repoId = "d361989f-a82e-4d64-aa30-25e6521e4f31";
      await handleRepoDelete(client, repoId, (msg) => lines.push(msg));

      expect(deletedId).toBe(repoId);
      const output = lines.join("\n");
      expect(output).toContain("Deleted");
      expect(output).toContain(repoId);
    });
  });

  describe("error handling", () => {
    it("propagates SDK errors from create", async () => {
      const { GitForgeError } = await import("@gitforge/sdk");
      const client = mockClient({
        create: async () => {
          throw new GitForgeError(422, "validation_error", "Name is required");
        },
      });

      const lines: string[] = [];
      await expect(
        handleRepoCreate(client, { name: "" }, (msg) => lines.push(msg)),
      ).rejects.toThrow("Name is required");
    });

    it("propagates SDK errors from list", async () => {
      const { GitForgeError } = await import("@gitforge/sdk");
      const client = mockClient({
        list: async () => {
          throw new GitForgeError(401, "unauthorized", "Invalid token");
        },
      });

      const lines: string[] = [];
      await expect(
        handleRepoList(client, { format: "table" }, (msg) => lines.push(msg)),
      ).rejects.toThrow("Invalid token");
    });
  });
});
