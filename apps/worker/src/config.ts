import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export type WorkerConfig = {
  port: number;
  rpcUrl: string;
  registryAddress?: `0x${string}`;
  nftAddress?: `0x${string}`;
  sovereignConsumerAddress?: `0x${string}`;
  agentManagerAddress?: `0x${string}`;
  asyncJobTrackerAddress?: `0x${string}`;
  daProvider?: string;
  hfRepoId?: string;
  relayUrl?: string;
  relayPollTimeoutMs: number;
  relayPollIntervalMs: number;
};

function applyEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;

  const source = readFileSync(filePath, "utf8");
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator <= 0) continue;

    const key = line.slice(0, separator).trim();
    if (!key || process.env[key] !== undefined) continue;

    let value = line.slice(separator + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

for (const candidate of [
  resolve(process.cwd(), ".env.local"),
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "../../.env.local"),
  resolve(process.cwd(), "../../.env")
]) {
  applyEnvFile(candidate);
}

export function loadConfig(): WorkerConfig {
  return {
    port: Number(process.env.PORT ?? process.env.WORKER_PORT ?? 8787),
    rpcUrl: process.env.RITUAL_RPC_URL ?? "https://rpc.ritualfoundation.org",
    registryAddress: process.env.REGISTRY_ADDRESS as `0x${string}` | undefined,
    nftAddress: process.env.NFT_ADDRESS as `0x${string}` | undefined,
    sovereignConsumerAddress: process.env.SOVEREIGN_CONSUMER_ADDRESS as `0x${string}` | undefined,
    agentManagerAddress: process.env.AGENT_MANAGER_ADDRESS as `0x${string}` | undefined,
    asyncJobTrackerAddress: process.env.ASYNC_JOB_TRACKER_ADDRESS as `0x${string}` | undefined,
    daProvider: process.env.DA_PROVIDER,
    hfRepoId: process.env.HF_REPO_ID,
    relayUrl: process.env.RELAY_URL,
    relayPollTimeoutMs: Number(process.env.RELAY_POLL_TIMEOUT_MS ?? 45000),
    relayPollIntervalMs: Number(process.env.RELAY_POLL_INTERVAL_MS ?? 2000)
  };
}
