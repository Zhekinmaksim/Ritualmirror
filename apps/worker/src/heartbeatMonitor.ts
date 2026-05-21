export type AgentHeartbeatStatus = {
  launcher?: string;
  online: boolean;
  lastSeenBlock?: bigint;
  diagnostics: string[];
};

import { createPublicClient, getAddress, http, isAddress, formatEther, parseAbi } from "viem";
import { ritualSystemAddresses, ritualTestnet } from "@ritual-mirror/ritual";
import { loadConfig } from "./config";

const config = loadConfig();

const client = createPublicClient({
  chain: ritualTestnet,
  transport: http(config.rpcUrl)
});

const agentHeartbeatAbi = parseAbi([
  "function isAlive(address agentAddress) view returns (bool)"
]);

async function readHeartbeat(address: `0x${string}`) {
  const [alive, nativeBalance, currentBlock] = await Promise.all([
    client.readContract({
      address: ritualSystemAddresses.agentHeartbeat,
      abi: agentHeartbeatAbi,
      functionName: "isAlive",
      args: [address]
    }),
    client.getBalance({ address }),
    client.getBlockNumber()
  ]);

  return { alive, nativeBalance, currentBlock };
}

export async function checkHeartbeat(launcher?: string, online = false): Promise<AgentHeartbeatStatus> {
  if (!launcher) {
    return {
      launcher,
      online: false,
      diagnostics: ["No Persistent Agent launcher is stored for this Mirror."]
    };
  }

  if (!isAddress(launcher)) {
    return {
      launcher,
      online: false,
      diagnostics: ["Stored launcher address is invalid."]
    };
  }

  try {
    const address = getAddress(launcher);
    const { alive, nativeBalance, currentBlock } = await readHeartbeat(address);
    const diagnostics: string[] = [];

    if (!alive) diagnostics.push("AgentHeartbeat does not currently mark this agent as alive.");
    if (!alive) diagnostics.push("No heartbeat has been observed for this agent on-chain yet.");
    diagnostics.push(`Agent native balance: ${formatEther(nativeBalance)} RITUAL.`);
    diagnostics.push(`Current block: ${currentBlock.toString()}.`);

    return {
      launcher: address,
      online: alive,
      diagnostics
    };
  } catch (error) {
    return {
      launcher,
      online,
      diagnostics: [error instanceof Error ? error.message : "Heartbeat check failed."]
    };
  }
}
