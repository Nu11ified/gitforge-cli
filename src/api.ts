import { readConfig } from "./config";
import { requireToken } from "./auth";

/**
 * Lightweight fetch wrapper that adds Bearer auth and targets the configured endpoint.
 * Used for API calls that don't go through the SDK (PATs, apps, etc.).
 */
export async function apiFetch<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown; token?: string } = {},
): Promise<T> {
  const config = readConfig();
  const token = opts.token ?? requireToken(undefined);
  const url = `${config.endpoint}${path}`;
  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return null as T;
  return res.json() as Promise<T>;
}
