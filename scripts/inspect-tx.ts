import "./_ritual-operator";
import { createPublicClient, http, isHex } from "viem";
import { ritualTestnet } from "@ritual-mirror/ritual";

const hashArg = process.argv[2] as `0x${string}` | undefined;

if (!hashArg || !isHex(hashArg)) {
  console.error("Usage: pnpm ritual:tx:inspect <tx-hash>");
  process.exit(1);
}

const client = createPublicClient({
  chain: ritualTestnet,
  transport: http(process.env.RITUAL_RPC_URL ?? "https://rpc.ritualfoundation.org")
});

async function main() {
  const tx = await client.getTransaction({ hash: hashArg }).catch(() => null);
  const receipt = await client.getTransactionReceipt({ hash: hashArg }).catch(() => null);

  console.log(
    JSON.stringify(
      {
        hash: hashArg,
        txFound: !!tx,
        receiptFound: !!receipt,
        tx: tx
          ? {
              from: tx.from,
              to: tx.to,
              nonce: tx.nonce,
              blockNumber: tx.blockNumber?.toString() ?? null,
              input: (tx.input ?? "0x").slice(0, 66)
            }
          : null,
        receipt: receipt
          ? {
              status: receipt.status,
              blockNumber: receipt.blockNumber?.toString(),
              contractAddress: receipt.contractAddress,
              gasUsed: receipt.gasUsed?.toString(),
              logs: receipt.logs.map((log) => ({
                address: log.address,
                topics: log.topics,
                data: log.data,
                blockNumber: log.blockNumber?.toString(),
                transactionHash: log.transactionHash
              }))
            }
          : null
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
