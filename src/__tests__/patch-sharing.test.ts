/**
 * Tests for CLI patch sharing commands: publish, unpublish, fork,
 * subscribe, unsubscribe, updates, accept.
 *
 * Uses mock GitForge client to verify handler logic and output.
 */

import { describe, it, expect, mock } from "bun:test";
import {
  handlePatchPublish,
  handlePatchUnpublish,
  handlePatchFork,
  handlePatchSubscribe,
  handlePatchUnsubscribe,
  handlePatchUpdates,
  handlePatchAccept,
} from "../commands/patch";
import type { GitForge } from "@gitforge/sdk";

// ---------------------------------------------------------------------------
// Mock client factory
// ---------------------------------------------------------------------------

function makeClient(overrides: Record<string, any> = {}): GitForge {
  return {
    patchSets: {
      publish: mock(async () => ({ id: "ps-1", name: "my-set" })),
      unpublish: mock(async () => void 0),
      fork: mock(async () => ({
        id: "ps-fork-1",
        name: "my-set",
        forkedFromId: "ps-1",
        repoId: "repo-1",
        patchCount: 3,
      })),
      subscribe: mock(async () => void 0),
      unsubscribe: mock(async () => void 0),
      getUpdates: mock(async () => ({
        hasUpdates: false,
        upstreamSetId: "ps-1",
        changes: [],
      })),
      acceptUpdates: mock(async () => ({ accepted: 0, conflicts: 0 })),
      ...overrides,
    },
  } as any;
}

function captureLog(): { lines: string[]; log: (msg: string) => void } {
  const lines: string[] = [];
  return { lines, log: (msg: string) => lines.push(msg) };
}

// ---------------------------------------------------------------------------
// publish
// ---------------------------------------------------------------------------

describe("gitforge patch publish", () => {
  it("calls patchSets.publish with set id and logs result", async () => {
    const client = makeClient();
    const { lines, log } = captureLog();
    await handlePatchPublish(client, { set: "ps-1" }, log);

    expect(client.patchSets.publish).toHaveBeenCalledWith("ps-1");
    expect(lines.some((l) => l.includes("Published"))).toBe(true);
    expect(lines.some((l) => l.includes("ps-1"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// unpublish
// ---------------------------------------------------------------------------

describe("gitforge patch unpublish", () => {
  it("calls patchSets.unpublish with set id", async () => {
    const client = makeClient();
    const { lines, log } = captureLog();
    await handlePatchUnpublish(client, { set: "ps-1" }, log);

    expect(client.patchSets.unpublish).toHaveBeenCalledWith("ps-1");
    expect(lines.some((l) => l.includes("Unpublished"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// fork
// ---------------------------------------------------------------------------

describe("gitforge patch fork", () => {
  it("forks a patch set and logs fork info", async () => {
    const client = makeClient();
    const { lines, log } = captureLog();
    await handlePatchFork(client, "ps-1", {}, log);

    expect(client.patchSets.fork).toHaveBeenCalledWith("ps-1", undefined);
    expect(lines.some((l) => l.includes("Forked"))).toBe(true);
    expect(lines.some((l) => l.includes("ps-fork-1"))).toBe(true);
  });

  it("passes custom name option to fork", async () => {
    const client = makeClient();
    const { lines, log } = captureLog();
    await handlePatchFork(client, "ps-1", { name: "custom-name" }, log);

    expect(client.patchSets.fork).toHaveBeenCalledWith("ps-1", { name: "custom-name" });
  });
});

// ---------------------------------------------------------------------------
// subscribe
// ---------------------------------------------------------------------------

describe("gitforge patch subscribe", () => {
  it("calls patchSets.subscribe with set id", async () => {
    const client = makeClient();
    const { lines, log } = captureLog();
    await handlePatchSubscribe(client, { set: "ps-fork-1" }, log);

    expect(client.patchSets.subscribe).toHaveBeenCalledWith("ps-fork-1");
    expect(lines.some((l) => l.includes("Subscribed"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// unsubscribe
// ---------------------------------------------------------------------------

describe("gitforge patch unsubscribe", () => {
  it("calls patchSets.unsubscribe with set id", async () => {
    const client = makeClient();
    const { lines, log } = captureLog();
    await handlePatchUnsubscribe(client, { set: "ps-fork-1" }, log);

    expect(client.patchSets.unsubscribe).toHaveBeenCalledWith("ps-fork-1");
    expect(lines.some((l) => l.includes("Unsubscribed"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// updates
// ---------------------------------------------------------------------------

describe("gitforge patch updates", () => {
  it("shows no updates when hasUpdates is false", async () => {
    const client = makeClient();
    const { lines, log } = captureLog();
    await handlePatchUpdates(client, { set: "ps-fork-1" }, log);

    expect(client.patchSets.getUpdates).toHaveBeenCalledWith("ps-fork-1");
    expect(lines.some((l) => l.includes("No upstream updates"))).toBe(true);
  });

  it("shows changes when updates are available", async () => {
    const client = makeClient({
      getUpdates: mock(async () => ({
        hasUpdates: true,
        upstreamSetId: "ps-1",
        changes: [
          { type: "added", patchId: "p-1", name: "new-patch", order: 4 },
          { type: "modified", patchId: "p-2", name: "fix-auth", order: 1 },
        ],
      })),
    });
    const { lines, log } = captureLog();
    await handlePatchUpdates(client, { set: "ps-fork-1" }, log);

    expect(lines.some((l) => l.includes("2 change(s)"))).toBe(true);
  });

  it("outputs JSON format when requested", async () => {
    const client = makeClient({
      getUpdates: mock(async () => ({
        hasUpdates: true,
        upstreamSetId: "ps-1",
        changes: [
          { type: "added", patchId: "p-1", name: "new-patch", order: 4 },
        ],
      })),
    });
    const { lines, log } = captureLog();
    await handlePatchUpdates(client, { set: "ps-fork-1", format: "json" }, log);

    const parsed = JSON.parse(lines[0]);
    expect(parsed.hasUpdates).toBe(true);
    expect(parsed.changes).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// accept
// ---------------------------------------------------------------------------

describe("gitforge patch accept", () => {
  it("accept all calls acceptUpdates with ['all']", async () => {
    const client = makeClient({
      acceptUpdates: mock(async () => ({ accepted: 3, conflicts: 0 })),
    });
    const { lines, log } = captureLog();
    await handlePatchAccept(client, { set: "ps-fork-1", all: true }, log);

    expect(client.patchSets.acceptUpdates).toHaveBeenCalledWith("ps-fork-1", {
      patches: ["all"],
    });
    expect(lines.some((l) => l.includes("Accepted 3"))).toBe(true);
  });

  it("accept specific patches passes IDs", async () => {
    const client = makeClient({
      acceptUpdates: mock(async () => ({ accepted: 2, conflicts: 0 })),
    });
    const { lines, log } = captureLog();
    await handlePatchAccept(
      client,
      { set: "ps-fork-1", patch: ["p-1", "p-2"] },
      log,
    );

    expect(client.patchSets.acceptUpdates).toHaveBeenCalledWith("ps-fork-1", {
      patches: ["p-1", "p-2"],
    });
    expect(lines.some((l) => l.includes("Accepted 2"))).toBe(true);
  });

  it("defaults to all when neither --all nor --patch given", async () => {
    const client = makeClient({
      acceptUpdates: mock(async () => ({ accepted: 1, conflicts: 0 })),
    });
    const { lines, log } = captureLog();
    await handlePatchAccept(client, { set: "ps-fork-1" }, log);

    expect(client.patchSets.acceptUpdates).toHaveBeenCalledWith("ps-fork-1", {
      patches: ["all"],
    });
  });

  it("shows conflicts count when present", async () => {
    const client = makeClient({
      acceptUpdates: mock(async () => ({ accepted: 2, conflicts: 1 })),
    });
    const { lines, log } = captureLog();
    await handlePatchAccept(client, { set: "ps-fork-1", all: true }, log);

    expect(lines.some((l) => l.includes("Conflicts: 1"))).toBe(true);
  });
});
