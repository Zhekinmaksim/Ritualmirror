import { encodeAbiParameters, encodeFunctionData, getAddress, isAddress, parseAbiParameters, toFunctionSelector } from "viem";
import {
  defaultPersistentSchedule,
  mirrorUserSalt,
  persistentFactoryAbi,
  persistentProviderEnum,
  persistentProviderKeyRef,
  persistentRepoRefs,
  ritualSystemAddresses,
  ritualTestnet,
  type PersistentProvider
} from "@ritual-mirror/ritual";
import { buildClients, maybeBroadcast, optionalBigInt, optionalNumber, parseEncryptedSecretHex, requireEnv, selectHttpExecutor } from "./_ritual-operator";

const persistentAbiParams = parseAbiParameters([
  "address",
  "bytes[]",
  "uint256",
  "bytes[]",
  "bytes",
  "uint64",
  "address",
  "bytes4",
  "uint256",
  "uint256",
  "uint256",
  "uint256",
  "uint8",
  "string",
  "string",
  "(string,string,string)",
  "(string,string,string)",
  "(string,string,string)",
  "(string,string,string)",
  "(string,string,string)",
  "(string,string,string)",
  "(string,string,string)",
  "(string,string,string)",
  "string",
  "string",
  "uint16"
].join(","));

function parseProvider(value: string): PersistentProvider {
  const lowered = value.toLowerCase();
  if (lowered === "anthropic" || lowered === "openai" || lowered === "gemini" || lowered === "xai" || lowered === "openrouter") {
    return lowered;
  }
  throw new Error(`Unsupported PERSISTENT_LLM_PROVIDER: ${value}`);
}

async function main() {
  const ownerArg = process.argv[2];
  const profileHash = process.argv[3] as `0x${string}` | undefined;
  if (!ownerArg || !profileHash) {
    throw new Error("Usage: pnpm ritual:persistent:launch <owner> <profileHash> [workspaceURI]");
  }
  if (!isAddress(ownerArg)) throw new Error("Owner must be a valid address.");

  const owner = getAddress(ownerArg);
  const workspaceURI = process.argv[4] ?? `hf://${requireEnv("HF_REPO_ID")}/ritual-mirror/${owner.toLowerCase()}`;
  const { account, walletClient, publicClient, rpcUrl } = buildClients();
  const mirrorLabel = process.env.RITUAL_MIRROR_LABEL ?? "ritual-mirror";
  if (owner !== account.address) {
    throw new Error(`Owner ${owner} does not match PRIVATE_KEY account ${account.address}.`);
  }

  const executor = await selectHttpExecutor();
  const userSalt = mirrorUserSalt(owner, mirrorLabel);
  const prediction = await publicClient.readContract({
    address: ritualSystemAddresses.persistentAgentFactory,
    abi: persistentFactoryAbi,
    functionName: "predictCompressedLauncher",
    args: [owner, userSalt]
  });
  const predictedLauncher = prediction[0];

  const repoId = requireEnv("HF_REPO_ID");
  const provider = parseProvider(requireEnv("PERSISTENT_LLM_PROVIDER"));
  const model = requireEnv("PERSISTENT_MODEL");
  const encryptedSecrets = parseEncryptedSecretHex("PERSISTENT_ENCRYPTED_SECRETS_HEX");
  const refs = persistentRepoRefs(owner, repoId);
  const schedule = defaultPersistentSchedule();
  schedule.maxFeePerGas = optionalBigInt("PERSISTENT_MAX_FEE_PER_GAS", 1_000_000_000n);
  schedule.maxPriorityFeePerGas = optionalBigInt("PERSISTENT_MAX_PRIORITY_FEE_PER_GAS", 100_000_000n);

  const schedulerLockDuration = optionalBigInt("PERSISTENT_SCHEDULER_LOCK_DURATION", 8_000n);
  const schedulerFunding = optionalBigInt("PERSISTENT_SCHEDULER_FUNDING_WEI", 0n);
  const dkmsFunding = optionalBigInt("PERSISTENT_DKMS_FUNDING_WEI", 0n);
  const totalValue = dkmsFunding + schedulerFunding;

  const persistentInput = encodeAbiParameters(persistentAbiParams, [
    executor.teeAddress,
    [encryptedSecrets],
    BigInt(optionalNumber("PERSISTENT_TTL", 300)),
    [],
    "0x",
    BigInt(optionalNumber("PERSISTENT_MAX_SPAWN_BLOCK", 600)),
    predictedLauncher,
    toFunctionSelector("onPersistentAgentResult(bytes32,bytes)"),
    optionalBigInt("PERSISTENT_DELIVERY_GAS_LIMIT", 500_000n),
    optionalBigInt("PERSISTENT_DELIVERY_MAX_FEE_PER_GAS", 1_000_000_000n),
    optionalBigInt("PERSISTENT_DELIVERY_MAX_PRIORITY_FEE_PER_GAS", 100_000_000n),
    0n,
    persistentProviderEnum(provider),
    model,
    persistentProviderKeyRef(provider),
    refs.daConfig,
    refs.soulRef,
    refs.agentsRef,
    refs.userRef,
    refs.memoryRef,
    refs.identityRef,
    refs.toolsRef,
    refs.openclawConfigRef,
    "",
    JSON.stringify({ ritual: rpcUrl }),
    0
  ]);

  const call = {
    address: ritualSystemAddresses.persistentAgentFactory,
    abi: persistentFactoryAbi,
    functionName: "launchPersistentCompressed",
    args: [
      userSalt,
      executor.teeAddress,
      optionalNumber("PERSISTENT_DKMS_TTL", 300),
      dkmsFunding,
      persistentInput,
      schedule,
      schedulerLockDuration,
      schedulerFunding
    ] as const
  };

  if (!maybeBroadcast()) {
    const data = encodeFunctionData(call);
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          chainId: ritualTestnet.id,
          owner,
          profileHash,
          workspaceURI,
          mirrorLabel,
          userSalt,
          executor,
          predictedLauncher,
          provider,
          model,
          totalValue: totalValue.toString(),
          calldata: data,
          notes: [
            "Persistent Agent does not support LLM_PROVIDER=ritual. Use anthropic/openai/gemini/xai/openrouter.",
            "PERSISTENT_ENCRYPTED_SECRETS_HEX must include both the provider API key and HF_TOKEN.",
            "Upload SOUL.md, MEMORY.md, IDENTITY.md, and TOOLS.md to the referenced HF repo paths before broadcast."
          ]
        },
        null,
        2
      )
    );
    return;
  }

  const hash = await walletClient.writeContract({
    ...call,
    value: totalValue,
    gas: 10_000_000n,
    account
  });

  console.log(
    JSON.stringify(
      {
        mode: "broadcast",
        owner,
        predictedLauncher,
        txHash: hash
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
