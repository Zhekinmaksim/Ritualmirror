import "./_ritual-operator";
import { createPublicClient, http } from "viem";
import { asyncJobTrackerAbi, ritualSystemAddresses, ritualTestnet } from "@ritual-mirror/ritual";

const sender = process.argv[2] as `0x${string}` | undefined;

if (!sender) {
  console.error("Usage: pnpm ritual:jobs:check 0xSender");
  process.exit(1);
}

const client = createPublicClient({
  chain: ritualTestnet,
  transport: http(process.env.RITUAL_RPC_URL ?? "https://rpc.ritualfoundation.org")
});

async function main() {
  const pending = await client.readContract({
    address: ritualSystemAddresses.asyncJobTracker,
    abi: asyncJobTrackerAbi,
    functionName: "hasPendingJobForSender",
    args: [sender]
  });

  console.log(JSON.stringify({ sender, pending }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
