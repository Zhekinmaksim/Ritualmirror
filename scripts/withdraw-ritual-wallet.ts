import "./_ritual-operator";
import { formatEther, parseEther } from "viem";
import { buildClients, maybeBroadcast } from "./_ritual-operator";
import { ritualSystemAddresses, ritualWalletAbi } from "@ritual-mirror/ritual";

const amountArg = process.argv[2];

if (!amountArg) {
  console.error("Usage: pnpm ritual:wallet:withdraw <amount-ritual|max>");
  process.exit(1);
}

async function main() {
  const { account, publicClient, walletClient } = buildClients();
  const [walletBalance, lockUntil, blockNumber] = await Promise.all([
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

  if (blockNumber < lockUntil) {
    throw new Error(`RitualWallet is still locked until block ${lockUntil}. Current block: ${blockNumber}.`);
  }

  const amount = amountArg === "max" ? walletBalance : parseEther(amountArg);
  if (amount <= 0n) {
    throw new Error("Withdraw amount must be greater than zero.");
  }
  if (amount > walletBalance) {
    throw new Error(
      `Withdraw amount ${formatEther(amount)} exceeds RitualWallet balance ${formatEther(walletBalance)}.`
    );
  }

  if (!maybeBroadcast()) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          account: account.address,
          amount: `${formatEther(amount)} RITUAL`,
          ritualWalletBalance: `${formatEther(walletBalance)} RITUAL`,
          lockUntil: lockUntil.toString(),
          currentBlock: blockNumber.toString()
        },
        null,
        2
      )
    );
    return;
  }

  const txHash = await walletClient.writeContract({
    address: ritualSystemAddresses.ritualWallet,
    abi: ritualWalletAbi,
    functionName: "withdraw",
    args: [amount],
    gas: 250_000n,
    account
  });

  console.log(
    JSON.stringify(
      {
        mode: "broadcast",
        account: account.address,
        amount: `${formatEther(amount)} RITUAL`,
        txHash
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
