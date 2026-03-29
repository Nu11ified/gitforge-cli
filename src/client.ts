import { GitForge } from "@gitforge/sdk";
import { readConfig } from "./config";
import { requireToken } from "./auth";

/**
 * Create an authenticated GitForge SDK client.
 * Uses stored config for endpoint and resolves token via priority chain.
 */
export function createClient(flagToken?: string): GitForge {
  const config = readConfig();
  const token = requireToken(flagToken);
  return new GitForge({
    baseUrl: config.endpoint,
    token,
  });
}
