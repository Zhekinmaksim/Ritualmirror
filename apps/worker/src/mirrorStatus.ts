import {
  asyncJobTrackerAbi,
  ritualMirrorAgentManagerAbi,
  ritualMirrorNftAbi,
  ritualMirrorRegistryAbi,
  ritualSystemAddresses,
  ritualTestnet,
  type AgentLifecycleStatus,
  type MirrorPhase,
  type MirrorStatusResponse
} from "@ritual-mirror/ritual";
import { createPublicClient, getAddress, http, isAddress, zeroAddress, zeroHash, type Address } from "viem";
import { loadConfig } from "./config";

const config = loadConfig();

const client = createPublicClient({
  chain: ritualTestnet,
  transport: http(config.rpcUrl)
});

const agentStatusMap: Record<number, AgentLifecycleStatus> = {
  0: "none",
  1: "spawning",
  2: "online",
  3: "paused",
  4: "failed"
};

async function readContractSafe<T>(read: () => Promise<T>) {
  try {
    return await read();
  } catch {
    return undefined;
  }
}

function lifecycleIndex(phase: MirrorPhase) {
  switch (phase) {
    case "unregistered":
      return 0;
    case "registered":
      return 1;
    case "genesis-linked":
      return 3;
    case "spawn-requested":
      return 4;
    case "launcher-stored":
      return 4;
    case "minted":
      return 5;
  }
}

export async function getMirrorStatus(address: string): Promise<MirrorStatusResponse> {
  if (!isAddress(address)) {
    throw new Error("Invalid mirror address.");
  }

  const owner = getAddress(address);
  const diagnostics: string[] = [];

  if (!config.registryAddress) diagnostics.push("REGISTRY_ADDRESS is not configured in worker.");
  if (!config.nftAddress) diagnostics.push("NFT_ADDRESS is not configured in worker.");
  if (!config.sovereignConsumerAddress) diagnostics.push("SOVEREIGN_CONSUMER_ADDRESS is not configured in worker.");
  if (!config.agentManagerAddress) diagnostics.push("AGENT_MANAGER_ADDRESS is not configured in worker.");

  const registryAddress = config.registryAddress;
  const nftAddress = config.nftAddress;
  const agentManagerAddress = config.agentManagerAddress;
  const asyncJobTrackerAddress = (config.asyncJobTrackerAddress ?? ritualSystemAddresses.asyncJobTracker) as Address;

  const hasMirror = registryAddress
    ? await readContractSafe(() =>
        client.readContract({
          address: registryAddress,
          abi: ritualMirrorRegistryAbi,
          functionName: "hasMirror",
          args: [owner]
        })
      )
    : undefined;

  const mirror = registryAddress
    ? await readContractSafe(() =>
        client.readContract({
          address: registryAddress,
          abi: ritualMirrorRegistryAbi,
          functionName: "getMirror",
          args: [owner]
        })
      )
    : undefined;

  const tokenId = nftAddress
    ? await readContractSafe(() =>
        client.readContract({
          address: nftAddress,
          abi: ritualMirrorNftAbi,
          functionName: "mirrorOf",
          args: [owner]
        })
      )
    : undefined;

  const tokenURI =
    nftAddress && tokenId && tokenId > 0n
      ? await readContractSafe(() =>
          client.readContract({
            address: nftAddress,
            abi: ritualMirrorNftAbi,
            functionName: "tokenURI",
            args: [tokenId]
          })
        )
      : undefined;

  const agentRecord = agentManagerAddress
    ? await readContractSafe(() =>
        client.readContract({
          address: agentManagerAddress,
          abi: ritualMirrorAgentManagerAbi,
          functionName: "agents",
          args: [owner]
        })
      )
    : undefined;

  const pendingJob = await readContractSafe(() =>
    client.readContract({
      address: asyncJobTrackerAddress,
      abi: asyncJobTrackerAbi,
      functionName: "hasPendingJobForSender",
      args: [owner]
    })
  );

  const agentLauncher = agentRecord?.[0];
  const agentWorkspaceURI = agentRecord?.[1];
  const agentStatusCode = Number(agentRecord?.[2] ?? 0);
  const agentUpdatedAt = agentRecord?.[3];

  const recordExists = hasMirror === true && !!mirror && mirror.createdAt > 0n;
  const deliveredGenesis = !!mirror && mirror.genesisJobId !== zeroHash;
  const storedLauncher = !!mirror && mirror.persistentAgentLauncher !== zeroAddress;
  const spawnRequested = agentStatusCode === 1 && !!agentWorkspaceURI;
  const minted = !!tokenId && tokenId > 0n;

  let phase: MirrorPhase = "unregistered";
  if (recordExists) phase = "registered";
  if (deliveredGenesis) phase = "genesis-linked";
  if (spawnRequested) phase = "spawn-requested";
  if (storedLauncher) phase = "launcher-stored";
  if (minted) phase = "minted";

  if (!recordExists) diagnostics.push("No active registry record was found for this address.");
  if (recordExists && !deliveredGenesis) {
    diagnostics.push("Registry record exists, but no delivered Genesis result is linked yet.");
  }
  if (recordExists && deliveredGenesis && !storedLauncher) {
    diagnostics.push("Genesis is linked, but no Persistent Agent launcher is stored yet.");
  }
  if (spawnRequested && !storedLauncher) {
    diagnostics.push("Spawn request is recorded in AgentManager, but launcher callback has not completed.");
  }
  if (pendingJob === true) diagnostics.push("AsyncJobTracker reports a pending job for this sender.");

  const launcher = agentLauncher && agentLauncher !== zeroAddress ? agentLauncher : undefined;
  const agentDiagnostics: string[] = [];
  if (!launcher && !storedLauncher) agentDiagnostics.push("No Persistent Agent launcher is stored for this Mirror.");
  if (launcher || storedLauncher) {
    agentDiagnostics.push("Heartbeat transport is not wired to AgentHeartbeat yet.");
  }

  const agentStatus = agentStatusMap[agentStatusCode] ?? "none";
  const relayConfigured = false;
  const chatAvailable = relayConfigured && agentStatus === "online" && (!!launcher || storedLauncher);

  return {
    address: owner,
    chainId: ritualTestnet.id,
    phase,
    lifecycleIndex: lifecycleIndex(phase),
    recordExists,
    pendingJob: pendingJob ?? null,
    relayConfigured,
    chatAvailable,
    diagnostics,
    contracts: {
      registry: config.registryAddress,
      nft: nftAddress,
      sovereignConsumer: config.sovereignConsumerAddress,
      agentManager: agentManagerAddress
    },
    mirror:
      recordExists && mirror
        ? {
            owner: mirror.owner,
            profileHash: mirror.profileHash,
            metadataURI: mirror.metadataURI,
            agentWorkspaceURI: mirror.agentWorkspaceURI,
            persistentAgentLauncher: mirror.persistentAgentLauncher,
            genesisJobId: mirror.genesisJobId,
            createdAt: mirror.createdAt.toString(),
            version: mirror.version.toString(),
            active: mirror.active
          }
        : null,
    nft: {
      minted,
      tokenId: minted ? tokenId?.toString() : undefined,
      tokenURI: typeof tokenURI === "string" ? tokenURI : undefined
    },
    agent: {
      launcher: launcher ?? (storedLauncher && mirror ? mirror.persistentAgentLauncher : undefined),
      workspaceURI: agentWorkspaceURI || mirror?.agentWorkspaceURI || undefined,
      status: agentStatus,
      updatedAt: agentUpdatedAt ? agentUpdatedAt.toString() : undefined,
      online: agentStatus === "online",
      diagnostics: agentDiagnostics
    }
  };
}
