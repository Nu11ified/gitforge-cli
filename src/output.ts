/**
 * Output formatting: table, JSON, and quiet modes.
 */

/**
 * Format data as an aligned table with headers and separator line.
 */
export function formatTable(headers: string[], rows: string[][]): string {
  // Calculate column widths
  const colWidths = headers.map((h, i) => {
    const cellWidths = rows.map((row) => (row[i] ?? "").length);
    return Math.max(h.length, ...cellWidths);
  });

  const pad = (str: string, width: number) => str.padEnd(width);

  // Header line
  const headerLine = headers.map((h, i) => pad(h, colWidths[i])).join("  ");

  // Separator line
  const separator = colWidths.map((w) => "-".repeat(w)).join("  ");

  // Data rows
  const dataLines = rows.map((row) =>
    row.map((cell, i) => pad(cell, colWidths[i])).join("  ")
  );

  return [headerLine, separator, ...dataLines].join("\n") + "\n";
}

/**
 * Format data as pretty-printed JSON.
 */
export function formatJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Dispatch to the appropriate formatter based on the format string.
 */
export function formatOutput(
  data: unknown,
  headers: string[],
  rows: string[][],
  format: "table" | "json" | "quiet"
): string {
  switch (format) {
    case "table":
      return formatTable(headers, rows);
    case "json":
      return formatJson(data);
    case "quiet":
      return "";
  }
}

/**
 * Returns true if stdout is a TTY.
 */
export function isTTY(): boolean {
  return process.stdout.isTTY ?? false;
}
