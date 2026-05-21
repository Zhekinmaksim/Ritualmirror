import { sovereignHarnessAbi } from "@ritual-mirror/ritual";
import { getAddress, isAddress } from "viem";
import { buildClients, maybeBroadcast } from "./_ritual-operator";

async function main() {
  const harnessArg = process.argv[2];
  if (!harnessArg) {
    throw new Error("Usage: pnpm ritual:sovereign:stop <harness-address>");
  }
  if (!isAddress(harnessArg)) {
    throw new Error("Harness address must be a valid address.");
  }

  const harness = getAddress(harnessArg);
  const { account, publicClient, walletClient } = buildClients();

  let owner: `0x${string}` | null = null;
  let configured: boolean | null = null;
  try {
    owner = await publicClient.readContract({
      address: harness,
      abi: sovereignHarnessAbi,
      functionName: "owner"
    });
    configured = await publicClient.readContract({
      address: harness,
      abi: sovereignHarnessAbi,
      functionName: "configured"
    });
  } catch {
    console.log(
      JSON.stringify(
        {
          mode: maybeBroadcast() ? "broadcast" : "dry-run",
          harness,
          stopped: false,
          skipped: true,
          reason: "not-a-sovereign-harness"
        },
        null,
        2
      )
    );
    return;
  }

  if (!maybeBroadcast()) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          harness,
          operator: account.address,
          owner,
          configured,
          stopped: false,
          skipped: false
        },
        null,
        2
      )
    );
    return;
  }

  if (owner !== account.address) {
    throw new Error(`Harness owner ${owner} does not match PRIVATE_KEY account ${account.address}.`);
  }

  const txHash = await walletClient.writeContract({
    address: harness,
    abi: sovereignHarnessAbi,
    functionName: "stop",
    gas: 500_000n,
    account
  });

  console.log(
    JSON.stringify(
      {
        mode: "broadcast",
        harness,
        owner,
        configured,
        stopped: true,
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
