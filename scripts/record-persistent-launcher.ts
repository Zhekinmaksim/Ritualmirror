import { ritualMirrorAgentManagerAbi } from "@ritual-mirror/ritual";
import { getAddress, isAddress } from "viem";
import { buildClients, maybeBroadcast, requireAddressEnv } from "./_ritual-operator";

async function main() {
  const userArg = process.argv[2];
  const launcherArg = process.argv[3];
  const workspaceURI = process.argv[4];

  if (!userArg || !launcherArg || !workspaceURI) {
    throw new Error("Usage: pnpm ritual:launcher:record <user> <launcher> <workspaceURI>");
  }
  if (!isAddress(userArg)) throw new Error("Invalid user address.");
  if (!isAddress(launcherArg)) throw new Error("Invalid launcher address.");

  const manager = requireAddressEnv("AGENT_MANAGER_ADDRESS");
  const { account, walletClient } = buildClients();

  if (!maybeBroadcast()) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          manager,
          operator: account.address,
          user: getAddress(userArg),
          launcher: getAddress(launcherArg),
          workspaceURI
        },
        null,
        2
      )
    );
    return;
  }

  const hash = await walletClient.writeContract({
    address: manager,
    abi: ritualMirrorAgentManagerAbi,
    functionName: "recordSpawnedAgent",
    args: [getAddress(userArg), getAddress(launcherArg), workspaceURI],
    gas: 500_000n,
    account
  });

  console.log(JSON.stringify({ mode: "broadcast", txHash: hash }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
