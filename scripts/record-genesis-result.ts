import { ritualMirrorSovereignConsumerAbi } from "@ritual-mirror/ritual";
import { getAddress, isAddress, isHex } from "viem";
import { buildClients, maybeBroadcast, requireAddressEnv } from "./_ritual-operator";

async function main() {
  const userArg = process.argv[2];
  const jobId = process.argv[3];
  const profileHash = process.argv[4];
  const metadataURI = process.argv[5];
  const workspaceURI = process.argv[6];

  if (!userArg || !jobId || !profileHash || !metadataURI || !workspaceURI) {
    throw new Error("Usage: pnpm ritual:genesis:record <user> <jobId> <profileHash> <metadataURI> <workspaceURI>");
  }
  if (!isAddress(userArg)) throw new Error("Invalid user address.");
  if (!isHex(jobId)) throw new Error("jobId must be 0x hex.");
  if (!isHex(profileHash)) throw new Error("profileHash must be 0x hex.");

  const consumer = requireAddressEnv("SOVEREIGN_CONSUMER_ADDRESS");
  const { account, walletClient } = buildClients();

  if (!maybeBroadcast()) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          consumer,
          operator: account.address,
          user: getAddress(userArg),
          jobId,
          profileHash,
          metadataURI,
          workspaceURI
        },
        null,
        2
      )
    );
    return;
  }

  const hash = await walletClient.writeContract({
    address: consumer,
    abi: ritualMirrorSovereignConsumerAbi,
    functionName: "recordGenesisFromOperator",
    args: [getAddress(userArg), jobId as `0x${string}`, profileHash as `0x${string}`, metadataURI, workspaceURI],
    gas: 500_000n,
    account
  });

  console.log(JSON.stringify({ mode: "broadcast", txHash: hash }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
