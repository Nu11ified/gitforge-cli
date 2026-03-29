import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export interface CliConfig {
  endpoint: string;
  defaultVisibility: "public" | "private";
  outputFormat: "table" | "json" | "quiet";
}

export interface CliAuth {
  token: string | null;
}

const DEFAULT_CONFIG: CliConfig = {
  endpoint: "http://localhost:3001",
  defaultVisibility: "private",
  outputFormat: "table",
};

export function getConfigDir(): string {
  const xdg = process.env.XDG_CONFIG_HOME;
  const base = xdg || join(homedir(), ".config");
  return join(base, "gitforge");
}

function configPath(): string {
  return join(getConfigDir(), "config.json");
}

function authPath(): string {
  return join(getConfigDir(), "auth.json");
}

function ensureDir(): void {
  const dir = getConfigDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function readConfig(): CliConfig {
  const path = configPath();
  if (!existsSync(path)) {
    return { ...DEFAULT_CONFIG };
  }
  try {
    const raw = readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function writeConfig(partial: Partial<CliConfig>): void {
  ensureDir();
  const existing = readConfig();
  const merged = { ...existing, ...partial };
  writeFileSync(configPath(), JSON.stringify(merged, null, 2) + "\n", "utf-8");
}

export function readAuth(): CliAuth {
  const path = authPath();
  if (!existsSync(path)) {
    return { token: null };
  }
  try {
    const raw = readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw);
    return { token: parsed.token ?? null };
  } catch {
    return { token: null };
  }
}

export function writeAuth(auth: CliAuth): void {
  ensureDir();
  writeFileSync(authPath(), JSON.stringify(auth, null, 2) + "\n", "utf-8");
}

export function clearAuth(): void {
  const path = authPath();
  if (existsSync(path)) {
    unlinkSync(path);
  }
}
