import { encodeFunctionData, getAddress, isAddress, toFunctionSelector, type Hex } from "viem";
import {
  defaultSovereignRolling,
  defaultSovereignSchedule,
  mirrorGenesisPrompt,
  mirrorUserSalt,
  ritualSystemAddresses,
  ritualTestnet,
  sovereignFactoryAbi,
  sovereignRepoRefs,
  assertScheduleLifespan,
  type MirrorGenesisPayload
} from "@ritual-mirror/ritual";
import { buildClients, loadJsonFile, maybeBroadcast, optionalBigInt, optionalNumber, parseEncryptedSecretHex, requireEnv, selectHttpExecutor } from "./_ritual-operator";

async function main() {
  const payloadPath = process.argv[2];
  if (!payloadPath) {
    throw new Error("Usage: pnpm ritual:sovereign:launch <payload-json-file>");
  }

  const payload = loadJsonFile<MirrorGenesisPayload>(payloadPath);
  if (!isAddress(payload.owner)) throw new Error("Payload owner is not a valid address.");

  const { account, walletClient, publicClient, rpcUrl } = buildClients();
  const owner = getAddress(payload.owner);
  if (owner !== account.address) {
    throw new Error(`Payload owner ${owner} does not match PRIVATE_KEY account ${account.address}.`);
  }

  const repoId = requireEnv("HF_REPO_ID");
  const model = process.env.MODEL ?? "zai-org/GLM-4.7-FP8";
  const mirrorLabel = process.env.RITUAL_MIRROR_LABEL ?? "ritual-mirror";
  const cliType = optionalNumber("SOVEREIGN_CLI_TYPE", 6);
  const schedulerLockDuration = optionalBigInt("SOVEREIGN_SCHEDULER_LOCK_DURATION", 8_000n);
  const schedulerFunding = optionalBigInt("SOVEREIGN_SCHEDULER_FUNDING_WEI", 0n);
  const dkmsFunding = optionalBigInt("SOVEREIGN_DKMS_FUNDING_WEI", 0n);
  const dkmsTtl = BigInt(optionalNumber("SOVEREIGN_DKMS_TTL", 300));
  const encryptedSecrets = parseEncryptedSecretHex("SOVEREIGN_ENCRYPTED_SECRETS_HEX");
  const prompt = process.env.SOVEREIGN_PROMPT ?? mirrorGenesisPrompt(payload);
  const maxTurns = optionalNumber("SOVEREIGN_MAX_TURNS", 1);
  const maxTokens = optionalNumber("SOVEREIGN_MAX_TOKENS", 4096);

  const executor = await selectHttpExecutor();
  const userSalt = mirrorUserSalt(owner, mirrorLabel);
  const prediction = await publicClient.readContract({
    address: ritualSystemAddresses.sovereignAgentFactory,
    abi: sovereignFactoryAbi,
    functionName: "predictCompressedHarness",
    args: [owner, userSalt]
  });

  const predictedHarness = prediction[0];
  const refs = sovereignRepoRefs(owner, repoId);
  const schedule = defaultSovereignSchedule();
  schedule.frequency = optionalNumber("SOVEREIGN_SCHEDULER_FREQUENCY", schedule.frequency);
  schedule.schedulerTtl = optionalNumber("SOVEREIGN_SCHEDULER_TTL", schedule.schedulerTtl);
  schedule.schedulerGas = optionalNumber("SOVEREIGN_SCHEDULER_GAS", schedule.schedulerGas);
  schedule.maxFeePerGas = optionalBigInt("SOVEREIGN_MAX_FEE_PER_GAS", 1_000_000_000n);
  schedule.maxPriorityFeePerGas = optionalBigInt("SOVEREIGN_MAX_PRIORITY_FEE_PER_GAS", 100_000_000n);

  const rolling = defaultSovereignRolling();
  rolling.windowNumCalls = optionalNumber("SOVEREIGN_WINDOW_NUM_CALLS", rolling.windowNumCalls);
  rolling.rolloverThresholdBps = optionalNumber("SOVEREIGN_ROLLOVER_THRESHOLD_BPS", rolling.rolloverThresholdBps);
  rolling.rolloverRetryEveryCalls = optionalNumber("SOVEREIGN_ROLLOVER_RETRY_EVERY_CALLS", rolling.rolloverRetryEveryCalls);
  assertScheduleLifespan(schedule, rolling.windowNumCalls);

  const params = {
    executor: executor.teeAddress,
    ttl: BigInt(optionalNumber("SOVEREIGN_TTL", 500)),
    userPublicKey: "0x",
    pollIntervalBlocks: BigInt(optionalNumber("SOVEREIGN_POLL_INTERVAL_BLOCKS", 5)),
    maxPollBlock: BigInt(optionalNumber("SOVEREIGN_MAX_POLL_BLOCK", 6000)),
    taskIdMarker: "RITUAL_MIRROR_GENESIS",
    deliveryTarget: predictedHarness,
    deliverySelector: toFunctionSelector("onSovereignAgentResult(bytes32,bytes)"),
    deliveryGasLimit: optionalBigInt("SOVEREIGN_DELIVERY_GAS_LIMIT", 3_000_000n),
    deliveryMaxFeePerGas: optionalBigInt("SOVEREIGN_DELIVERY_MAX_FEE_PER_GAS", 1_000_000_000n),
    deliveryMaxPriorityFeePerGas: optionalBigInt("SOVEREIGN_DELIVERY_MAX_PRIORITY_FEE_PER_GAS", 100_000_000n),
    cliType,
    prompt,
    encryptedSecrets,
    convoHistory: refs.convoHistory,
    output: refs.output,
    skills: [],
    systemPrompt: refs.systemPrompt,
    model,
    tools: [] as string[],
    maxTurns,
    maxTokens,
    rpcUrls: JSON.stringify({ ritual: rpcUrl })
  } as const;

  const totalValue = dkmsFunding + schedulerFunding;
  const call = {
    address: ritualSystemAddresses.sovereignAgentFactory,
    abi: sovereignFactoryAbi,
    functionName: "launchSovereignCompressed",
    args: [
      userSalt,
      executor.teeAddress,
      Number(dkmsTtl),
      dkmsFunding,
      params,
      schedule,
      schedulerLockDuration,
      schedulerFunding,
      rolling.windowNumCalls
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
          mirrorLabel,
          userSalt,
          executor,
          predictedHarness,
          repoId,
          model,
          totalValue: totalValue.toString(),
          schedulerFunding: schedulerFunding.toString(),
          dkmsFunding: dkmsFunding.toString(),
          calldata: data,
          notes: [
            "Upload the referenced HF files before broadcast: session path, artifacts prefix, and system prompt path.",
            "SOVEREIGN_ENCRYPTED_SECRETS_HEX must be an executor-key-encrypted blob including at least LLM_PROVIDER and HF_TOKEN."
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
    gas: 5_000_000n,
    account
  });

  console.log(
    JSON.stringify(
      {
        mode: "broadcast",
        owner,
        predictedHarness,
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
