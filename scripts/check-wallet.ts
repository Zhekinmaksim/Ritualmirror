import "./_ritual-operator";
import { createPublicClient, formatEther, http } from "viem";
import { ritualSystemAddresses, ritualTestnet, ritualWalletAbi } from "@ritual-mirror/ritual";

const account = process.argv[2] as `0x${string}` | undefined;

if (!account) {
  console.error("Usage: pnpm ritual:wallet:check 0xAccount");
  process.exit(1);
}

const client = createPublicClient({
  chain: ritualTestnet,
  transport: http(process.env.RITUAL_RPC_URL ?? "https://rpc.ritualfoundation.org")
});

async function main() {
  const [nativeBalance, walletBalance, lockUntil, blockNumber] = await Promise.all([
    client.getBalance({ address: account }),
    client.readContract({
      address: ritualSystemAddresses.ritualWallet,
      abi: ritualWalletAbi,
      functionName: "balanceOf",
      args: [account]
    }),
    client.readContract({
      address: ritualSystemAddresses.ritualWallet,
      abi: ritualWalletAbi,
      functionName: "lockUntil",
      args: [account]
    }),
    client.getBlockNumber()
  ]);

  console.log(JSON.stringify({
    account,
    nativeBalance: `${formatEther(nativeBalance)} RITUAL`,
    ritualWalletBalance: `${formatEther(walletBalance)} RITUAL`,
    lockUntil: lockUntil.toString(),
    currentBlock: blockNumber.toString(),
    locked: blockNumber < lockUntil
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
