import { describe, it, expect } from "bun:test";

import {
  formatTable,
  formatJson,
  formatOutput,
  isTTY,
} from "../output";

describe("output module", () => {
  describe("formatTable", () => {
    it("renders headers + rows with aligned columns", () => {
      const headers = ["NAME", "VISIBILITY", "DEFAULT BRANCH"];
      const rows = [
        ["my-repo", "private", "main"],
        ["another-repo", "public", "develop"],
      ];
      const result = formatTable(headers, rows);
      const lines = result.split("\n");

      // Header line
      expect(lines[0]).toContain("NAME");
      expect(lines[0]).toContain("VISIBILITY");
      expect(lines[0]).toContain("DEFAULT BRANCH");

      // Separator line
      expect(lines[1]).toMatch(/^[-\s]+$/);

      // Data rows
      expect(lines[2]).toContain("my-repo");
      expect(lines[2]).toContain("private");
      expect(lines[2]).toContain("main");
      expect(lines[3]).toContain("another-repo");
      expect(lines[3]).toContain("public");
      expect(lines[3]).toContain("develop");

      // Column alignment: "NAME" column should be padded to at least "another-repo" width
      // Both "my-repo" and "another-repo" should start at same position
      const nameColWidth = Math.max("NAME".length, "my-repo".length, "another-repo".length);
      // Check that the header column is padded
      expect(lines[0].indexOf("VISIBILITY")).toBeGreaterThan(nameColWidth);
    });

    it("handles empty rows (headers only)", () => {
      const headers = ["ID", "NAME"];
      const rows: string[][] = [];
      const result = formatTable(headers, rows);
      const lines = result.split("\n").filter((l) => l.length > 0);
      // Should have header + separator, no data rows
      expect(lines.length).toBe(2);
      expect(lines[0]).toContain("ID");
      expect(lines[0]).toContain("NAME");
    });

    it("handles single column", () => {
      const headers = ["NAME"];
      const rows = [["alpha"], ["beta"]];
      const result = formatTable(headers, rows);
      const lines = result.split("\n").filter((l) => l.length > 0);
      expect(lines.length).toBe(4); // header + separator + 2 rows
      expect(lines[0].trim()).toBe("NAME");
      expect(lines[2].trim()).toBe("alpha");
      expect(lines[3].trim()).toBe("beta");
    });
  });

  describe("formatJson", () => {
    it("produces valid JSON string", () => {
      const data = { name: "my-repo", visibility: "private" };
      const result = formatJson(data);
      expect(JSON.parse(result)).toEqual(data);
    });

    it("handles arrays", () => {
      const data = [
        { id: 1, name: "a" },
        { id: 2, name: "b" },
      ];
      const result = formatJson(data);
      expect(JSON.parse(result)).toEqual(data);
    });
  });

  describe("formatOutput", () => {
    const data = [{ name: "repo1" }, { name: "repo2" }];
    const headers = ["NAME"];
    const rows = [["repo1"], ["repo2"]];

    it("returns table when format=table", () => {
      const result = formatOutput(data, headers, rows, "table");
      expect(result).toContain("NAME");
      expect(result).toContain("repo1");
      expect(result).toContain("repo2");
      // Should have separator line
      expect(result).toMatch(/---/);
    });

    it("returns JSON when format=json", () => {
      const result = formatOutput(data, headers, rows, "json");
      const parsed = JSON.parse(result);
      expect(parsed).toEqual(data);
    });

    it("returns empty when format=quiet", () => {
      const result = formatOutput(data, headers, rows, "quiet");
      expect(result).toBe("");
    });
  });

  describe("isTTY", () => {
    it("returns boolean (does not throw)", () => {
      const result = isTTY();
      expect(typeof result).toBe("boolean");
    });
  });
});
