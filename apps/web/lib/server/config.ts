export type WebServerConfig = {
  rpcUrl: string;
  registryAddress?: `0x${string}`;
  nftAddress?: `0x${string}`;
  sovereignConsumerAddress?: `0x${string}`;
  agentManagerAddress?: `0x${string}`;
  asyncJobTrackerAddress?: `0x${string}`;
  relayUrl?: string;
  relayPollTimeoutMs: number;
  relayPollIntervalMs: number;
};

export function loadWebServerConfig(): WebServerConfig {
  return {
    rpcUrl: process.env.NEXT_PUBLIC_RITUAL_RPC_URL ?? process.env.RITUAL_RPC_URL ?? "https://rpc.ritualfoundation.org",
    registryAddress: (process.env.NEXT_PUBLIC_REGISTRY_ADDRESS ?? process.env.REGISTRY_ADDRESS) as `0x${string}` | undefined,
    nftAddress: (process.env.NEXT_PUBLIC_NFT_ADDRESS ?? process.env.NFT_ADDRESS) as `0x${string}` | undefined,
    sovereignConsumerAddress: (process.env.NEXT_PUBLIC_SOVEREIGN_CONSUMER_ADDRESS ??
      process.env.SOVEREIGN_CONSUMER_ADDRESS) as `0x${string}` | undefined,
    agentManagerAddress: (process.env.NEXT_PUBLIC_AGENT_MANAGER_ADDRESS ??
      process.env.AGENT_MANAGER_ADDRESS) as `0x${string}` | undefined,
    asyncJobTrackerAddress: process.env.ASYNC_JOB_TRACKER_ADDRESS as `0x${string}` | undefined,
    relayUrl: process.env.RELAY_URL,
    relayPollTimeoutMs: Number(process.env.RELAY_POLL_TIMEOUT_MS ?? 45000),
    relayPollIntervalMs: Number(process.env.RELAY_POLL_INTERVAL_MS ?? 2000)
  };
}
