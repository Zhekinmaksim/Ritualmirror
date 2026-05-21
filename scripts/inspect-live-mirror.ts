import "./_ritual-operator";
import {
  getAddress,
  isAddress,
  zeroAddress
} from "viem";
import {
  ritualMirrorAgentManagerAbi,
  ritualMirrorNftAbi,
  ritualMirrorRegistryAbi
} from "@ritual-mirror/ritual";
import { buildClients, requireAddressEnv } from "./_ritual-operator";

function normalizeAgentRecord(
  agent:
    | {
        launcher?: `0x${string}`;
        workspaceURI?: string;
        status?: bigint | number;
        updatedAt?: bigint;
      }
    | readonly unknown[]
) {
  if (Array.isArray(agent)) {
    return {
      launcher: String(agent[0] ?? zeroAddress),
      workspaceURI: String(agent[1] ?? ""),
      status: Number(agent[2] ?? 0),
      updatedAt: BigInt(agent[3] ?? 0n).toString()
    };
  }

  return {
    launcher: agent.launcher ?? zeroAddress,
    workspaceURI: agent.workspaceURI ?? "",
    status: Number(agent.status ?? 0),
    updatedAt: BigInt(agent.updatedAt ?? 0n).toString()
  };
}

async function main() {
  const userArg = process.argv[2];
  if (!userArg || !isAddress(userArg)) {
    throw new Error("Usage: node --import tsx scripts/inspect-live-mirror.ts <user-address>");
  }

  const user = getAddress(userArg);
  const registry = requireAddressEnv("NEXT_PUBLIC_REGISTRY_ADDRESS");
  const nft = requireAddressEnv("NEXT_PUBLIC_NFT_ADDRESS");
  const agentManager = requireAddressEnv("NEXT_PUBLIC_AGENT_MANAGER_ADDRESS");
  const { publicClient } = buildClients();

  const [mirror, agent, tokenId] = await Promise.all([
    publicClient.readContract({
      address: registry,
      abi: ritualMirrorRegistryAbi,
      functionName: "getMirror",
      args: [user]
    }),
    publicClient.readContract({
      address: agentManager,
      abi: ritualMirrorAgentManagerAbi,
      functionName: "agents",
      args: [user]
    }),
    publicClient.readContract({
      address: nft,
      abi: ritualMirrorNftAbi,
      functionName: "mirrorOf",
      args: [user]
    })
  ]);

  let tokenUri: string | null = null;
  if (tokenId > 0n) {
    tokenUri = await publicClient.readContract({
      address: nft,
      abi: ritualMirrorNftAbi,
      functionName: "tokenURI",
      args: [tokenId]
    });
  }

  const normalizedAgent = normalizeAgentRecord(agent);

  console.log(
    JSON.stringify(
      {
        user,
        registry,
        agentManager,
        nft,
        mirror: {
          owner: mirror.owner,
          profileHash: mirror.profileHash,
          metadataURI: mirror.metadataURI,
          agentWorkspaceURI: mirror.agentWorkspaceURI,
          persistentAgentLauncher: mirror.persistentAgentLauncher,
          genesisJobId: mirror.genesisJobId,
          createdAt: mirror.createdAt.toString(),
          version: mirror.version.toString(),
          active: mirror.active
        },
        agent: {
          launcher: normalizedAgent.launcher,
          workspaceURI: normalizedAgent.workspaceURI,
          status: normalizedAgent.status,
          updatedAt: normalizedAgent.updatedAt
        },
        nftState: {
          tokenId: tokenId.toString(),
          minted: tokenId > 0n,
          tokenURI: tokenUri
        },
        checkpoints: {
          genesisRecorded: mirror.genesisJobId !== "0x0000000000000000000000000000000000000000000000000000000000000000",
          workspaceLinked: mirror.agentWorkspaceURI.length > 0,
          launcherRecorded:
            mirror.persistentAgentLauncher !== zeroAddress && normalizedAgent.launcher !== zeroAddress
        }
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
