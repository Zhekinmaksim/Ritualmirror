import { ritualMirrorNftAbi } from "@ritual-mirror/ritual";
import { getAddress, isAddress } from "viem";
import { buildClients, maybeBroadcast, requireAddressEnv } from "./_ritual-operator";

async function main() {
  const userArg = process.argv[2];
  const tokenUri = process.argv[3];

  if (!userArg || !tokenUri) {
    throw new Error("Usage: pnpm ritual:nft:mint <user> <tokenURI>");
  }
  if (!isAddress(userArg)) {
    throw new Error("Invalid user address.");
  }

  const user = getAddress(userArg);
  const nft = requireAddressEnv("NEXT_PUBLIC_NFT_ADDRESS");
  const { account, walletClient } = buildClients();

  if (!maybeBroadcast()) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          nft,
          operator: account.address,
          user,
          tokenURI: tokenUri
        },
        null,
        2
      )
    );
    return;
  }

  const hash = await walletClient.writeContract({
    address: nft,
    abi: ritualMirrorNftAbi,
    functionName: "mintMirror",
    args: [user, tokenUri],
    gas: 500_000n,
    account
  });

  console.log(JSON.stringify({ mode: "broadcast", txHash: hash }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
