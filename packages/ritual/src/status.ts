export type AgentLifecycleStatus = "none" | "spawning" | "online" | "paused" | "failed";

export type MirrorPhase =
  | "unregistered"
  | "registered"
  | "genesis-linked"
  | "spawn-requested"
  | "launcher-stored"
  | "minted";

export type MirrorRecordStatus = {
  owner: `0x${string}`;
  profileHash: `0x${string}`;
  metadataURI: string;
  agentWorkspaceURI: string;
  persistentAgentLauncher: `0x${string}`;
  genesisJobId: `0x${string}`;
  createdAt: string;
  version: string;
  active: boolean;
};

export type MirrorNftStatus = {
  minted: boolean;
  tokenId?: string;
  tokenURI?: string;
};

export type PersistentAgentStatus = {
  launcher?: `0x${string}`;
  workspaceURI?: string;
  status: AgentLifecycleStatus;
  updatedAt?: string;
  online: boolean;
  diagnostics: string[];
};

export type MirrorStatusResponse = {
  address: `0x${string}`;
  chainId: number;
  phase: MirrorPhase;
  lifecycleIndex: number;
  recordExists: boolean;
  pendingJob: boolean | null;
  relayConfigured: boolean;
  chatAvailable: boolean;
  diagnostics: string[];
  contracts: {
    registry?: `0x${string}`;
    nft?: `0x${string}`;
    sovereignConsumer?: `0x${string}`;
    agentManager?: `0x${string}`;
  };
  mirror: MirrorRecordStatus | null;
  nft: MirrorNftStatus;
  agent: PersistentAgentStatus;
};
