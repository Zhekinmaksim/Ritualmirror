import { formatEther, parseEther } from "viem";
import { ritualSystemAddresses, ritualTestnet, ritualWalletAbi } from "@ritual-mirror/ritual";
import { buildClients, maybeBroadcast, optionalBigInt } from "./_ritual-operator";

function parseValue(input?: string) {
  if (!input) {
    return optionalBigInt("RITUAL_WALLET_DEPOSIT_WEI", parseEther("5"));
  }

  if (input.includes(".")) {
    return parseEther(input);
  }

  return BigInt(input);
}

async function main() {
  const amount = parseValue(process.argv[2]);
  const lockDuration = process.argv[3] ? BigInt(process.argv[3]) : optionalBigInt("RITUAL_WALLET_LOCK_DURATION", 10_000n);
  const { account, publicClient, walletClient } = buildClients();

  const [nativeBalance, ritualWalletBalance, lockUntil, currentBlock] = await Promise.all([
    publicClient.getBalance({ address: account.address }),
    publicClient.readContract({
      address: ritualSystemAddresses.ritualWallet,
      abi: ritualWalletAbi,
      functionName: "balanceOf",
      args: [account.address]
    }),
    publicClient.readContract({
      address: ritualSystemAddresses.ritualWallet,
      abi: ritualWalletAbi,
      functionName: "lockUntil",
      args: [account.address]
    }),
    publicClient.getBlockNumber()
  ]);

  if (!maybeBroadcast()) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          chainId: ritualTestnet.id,
          account: account.address,
          depositWei: amount.toString(),
          depositRitual: formatEther(amount),
          lockDuration: lockDuration.toString(),
          nativeBalance: formatEther(nativeBalance),
          ritualWalletBalance: formatEther(ritualWalletBalance),
          lockUntil: lockUntil.toString(),
          currentBlock: currentBlock.toString()
        },
        null,
        2
      )
    );
    return;
  }

  const hash = await walletClient.writeContract({
    address: ritualSystemAddresses.ritualWallet,
    abi: ritualWalletAbi,
    functionName: "deposit",
    args: [lockDuration],
    value: amount,
    gas: 250_000n,
    account
  });

  console.log(
    JSON.stringify(
      {
        mode: "broadcast",
        account: account.address,
        txHash: hash,
        depositWei: amount.toString(),
        depositRitual: formatEther(amount),
        lockDuration: lockDuration.toString()
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
