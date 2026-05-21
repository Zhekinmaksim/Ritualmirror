import {
  createPublicClient,
  decodeAbiParameters,
  encodeAbiParameters,
  formatEther,
  getAddress,
  http,
  isAddress,
  parseAbi,
  parseAbiParameters
} from "viem";
import { ritualTestnet } from "@ritual-mirror/ritual";
import { buildClients, maybeBroadcast, optionalBigInt, optionalNumber, requireEnv, selectHttpExecutor } from "./_ritual-operator";

const consumerAbi = parseAbi([
  "function callDKMSKey(bytes input) external returns (bytes)"
]);

type RawSpcCall = {
  address?: string;
  output?: string;
  blockNumber?: string | number;
};

type RawTransactionWithSpcCalls = {
  spcCalls?: RawSpcCall[];
};

async function waitForDkmsOutput(
  rpcUrl: string,
  hash: `0x${string}`,
  timeoutSeconds: number
) {
  const client = createPublicClient({
    chain: ritualTestnet,
    transport: http(rpcUrl)
  });

  const deadline = Date.now() + timeoutSeconds * 1000;

  while (Date.now() < deadline) {
    const tx = (await client.request({
      method: "eth_getTransactionByHash",
      params: [hash]
    }).catch(() => null)) as RawTransactionWithSpcCalls | null;

    const spcCall = tx?.spcCalls?.find(
      (entry) => entry.address?.toLowerCase() === "0x000000000000000000000000000000000000081b"
    );

    const output = spcCall?.output;
    if (output && output !== "0x") {
      const [paymentAddress, publicKey] = decodeAbiParameters(parseAbiParameters("address, bytes"), output as `0x${string}`);
      return {
        paymentAddress: getAddress(paymentAddress),
        publicKey: publicKey as `0x${string}`
      };
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Timed out waiting for DKMS output after ${timeoutSeconds}s.`);
}

async function main() {
  const consumerArg = process.argv[2];
  if (!consumerArg || !isAddress(consumerArg)) {
    throw new Error("Usage: node --import tsx scripts/bootstrap-persistent-dkms.ts <consumer>");
  }

  const consumer = getAddress(consumerArg);
  const dkmsTtl = BigInt(optionalNumber("PERSISTENT_DKMS_TTL", 60));
  const keyIndex = optionalBigInt("PERSISTENT_DKMS_KEY_INDEX", 0n);
  const phase1Timeout = optionalNumber("PERSISTENT_DKMS_TIMEOUT_SECONDS", 300);
  const minChildFundWei = optionalBigInt("PERSISTENT_CHILD_MIN_NATIVE_WEI", 100_000_000_000_000_000_000n);
  const fundChildWei = optionalBigInt("PERSISTENT_CHILD_FUND_WEI", 100_000_000_000_000_000_000_000n);

  const { account, publicClient, walletClient, rpcUrl } = buildClients();
  const executor = await selectHttpExecutor();

  const dkmsInput = encodeAbiParameters(
    parseAbiParameters("address, bytes[], uint256, bytes[], bytes, address, uint256, uint8"),
    [executor.teeAddress, [], dkmsTtl, [], "0x", account.address, keyIndex, 1]
  );

  if (!maybeBroadcast()) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          owner: account.address,
          consumer,
          executor,
          dkmsInput,
          minChildFundWei: minChildFundWei.toString(),
          fundChildWei: fundChildWei.toString()
        },
        null,
        2
      )
    );
    return;
  }

  const txHash = await walletClient.writeContract({
    address: consumer,
    abi: consumerAbi,
    functionName: "callDKMSKey",
    args: [dkmsInput],
    gas: 500_000n,
    account
  });

  const { paymentAddress, publicKey } = await waitForDkmsOutput(rpcUrl, txHash, phase1Timeout);
  const childBalance = await publicClient.getBalance({ address: paymentAddress });

  let fundingTxHash: `0x${string}` | null = null;
  if (childBalance < minChildFundWei) {
    fundingTxHash = await walletClient.sendTransaction({
      to: paymentAddress,
      value: fundChildWei,
      account
    });
  }

  const nextBalance = await publicClient.getBalance({ address: paymentAddress });

  console.log(
    JSON.stringify(
      {
        mode: "broadcast",
        owner: account.address,
        consumer,
        txHash,
        paymentAddress,
        publicKey,
        childBalanceWei: childBalance.toString(),
        childBalanceRitual: formatEther(childBalance),
        fundingTxHash,
        nextBalanceWei: nextBalance.toString(),
        nextBalanceRitual: formatEther(nextBalance)
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
