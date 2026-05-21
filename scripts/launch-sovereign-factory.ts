import { encodeFunctionData, getAddress, isAddress, toFunctionSelector } from "viem";
import {
  assertScheduleLifespan,
  defaultSovereignRolling,
  defaultSovereignSchedule,
  mirrorUserSalt,
  ritualSystemAddresses,
  ritualTestnet,
  ritualRpcMap,
  sovereignFactoryAbi,
  sovereignHarnessAbi,
  sovereignRepoRefs,
  type MirrorGenesisPayload
} from "@ritual-mirror/ritual";
import {
  buildClients,
  loadJsonFile,
  maybeBroadcast,
  optionalBigInt,
  optionalNumber,
  parseEncryptedSecretHex,
  requireEnv,
  selectHttpExecutor
} from "./_ritual-operator";

type LaunchMode = "two-step" | "compressed";

const DEFAULT_COMPACT_GENESIS_PROMPT =
  "Read the referenced system prompt and repository context. Return only the required Ritual Mirror genesis JSON object.";

function parseMode(): LaunchMode {
  const value = (process.env.SOVEREIGN_FACTORY_MODE ?? "two-step").trim().toLowerCase();
  if (value === "two-step" || value === "compressed") {
    return value;
  }
  throw new Error(`Unsupported SOVEREIGN_FACTORY_MODE: ${value}`);
}

async function main() {
  const payloadPath = process.argv[2];
  if (!payloadPath) {
    throw new Error("Usage: pnpm ritual:sovereign:launch <payload-json-file>");
  }

  const payload = loadJsonFile<MirrorGenesisPayload>(payloadPath);
  if (!isAddress(payload.owner)) throw new Error("Payload owner is not a valid address.");

  const launchMode = parseMode();
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
  const prompt = process.env.SOVEREIGN_PROMPT ?? DEFAULT_COMPACT_GENESIS_PROMPT;
  const maxTurns = optionalNumber("SOVEREIGN_MAX_TURNS", 1);
  const maxTokens = optionalNumber("SOVEREIGN_MAX_TOKENS", 4096);

  const executor = await selectHttpExecutor();
  const userSalt = mirrorUserSalt(owner, mirrorLabel);
  const predicted = await publicClient.readContract({
    address: ritualSystemAddresses.sovereignAgentFactory,
    abi: sovereignFactoryAbi,
    functionName: launchMode === "compressed" ? "predictCompressedHarness" : "predictHarness",
    args: [owner, userSalt]
  });
  const predictedHarness = predicted[0];

  const refs = sovereignRepoRefs(owner, repoId);
  const schedule = defaultSovereignSchedule();
  schedule.frequency = optionalNumber(
    "SOVEREIGN_SCHEDULER_FREQUENCY",
    launchMode === "two-step" ? 2_000 : schedule.frequency
  );
  schedule.schedulerTtl = optionalNumber("SOVEREIGN_SCHEDULER_TTL", schedule.schedulerTtl);
  schedule.schedulerGas = optionalNumber("SOVEREIGN_SCHEDULER_GAS", schedule.schedulerGas);
  schedule.maxFeePerGas = optionalBigInt("SOVEREIGN_MAX_FEE_PER_GAS", 1_000_000_000n);
  schedule.maxPriorityFeePerGas = optionalBigInt("SOVEREIGN_MAX_PRIORITY_FEE_PER_GAS", 100_000_000n);

  if (launchMode === "two-step" && schedule.frequency < 2_000 && process.env.SOVEREIGN_ALLOW_LOW_FREQUENCY !== "1") {
    throw new Error(
      `SOVEREIGN_SCHEDULER_FREQUENCY=${schedule.frequency} is unsafe for factory-backed Genesis. Use >= 2000 or set SOVEREIGN_ALLOW_LOW_FREQUENCY=1 only for intentional debugging.`
    );
  }

  const rolling = defaultSovereignRolling();
  rolling.windowNumCalls = optionalNumber(
    "SOVEREIGN_WINDOW_NUM_CALLS",
    launchMode === "two-step" ? 1 : rolling.windowNumCalls
  );
  rolling.rolloverThresholdBps = optionalNumber(
    "SOVEREIGN_ROLLOVER_THRESHOLD_BPS",
    launchMode === "two-step" ? 10_000 : rolling.rolloverThresholdBps
  );
  rolling.rolloverRetryEveryCalls = optionalNumber(
    "SOVEREIGN_ROLLOVER_RETRY_EVERY_CALLS",
    rolling.rolloverRetryEveryCalls
  );
  assertScheduleLifespan(schedule, rolling.windowNumCalls);

  const params = {
    executor: executor.teeAddress,
    ttl: BigInt(optionalNumber("SOVEREIGN_TTL", 500)),
    userPublicKey: "0x",
    pollIntervalBlocks: BigInt(optionalNumber("SOVEREIGN_POLL_INTERVAL_BLOCKS", 5)),
    maxPollBlock: BigInt(optionalNumber("SOVEREIGN_MAX_POLL_BLOCK", 6_000)),
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
    rpcUrls: ritualRpcMap(rpcUrl)
  } as const;

  const deployCall = {
    address: ritualSystemAddresses.sovereignAgentFactory,
    abi: sovereignFactoryAbi,
    functionName: "deployHarness",
    args: [userSalt] as const
  };

  const configureCall = {
    address: predictedHarness,
    abi: sovereignHarnessAbi,
    functionName: "configureFundAndStart",
    args: [params, schedule, rolling, schedulerLockDuration] as const
  };

  const compressedCall = {
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
    const predictedCode = await publicClient.getCode({ address: predictedHarness });

    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          launchMode,
          chainId: ritualTestnet.id,
          owner,
          mirrorLabel,
          userSalt,
          executor,
          predictedHarness,
          predictedHarnessDeployed: predictedCode !== undefined && predictedCode !== "0x",
          repoId,
          model,
          schedulerFunding: schedulerFunding.toString(),
          schedulerLockDuration: schedulerLockDuration.toString(),
          dkmsFunding: dkmsFunding.toString(),
          schedule: {
            ...schedule,
            maxFeePerGas: schedule.maxFeePerGas.toString(),
            maxPriorityFeePerGas: schedule.maxPriorityFeePerGas.toString(),
            value: schedule.value.toString()
          },
          rolling,
          calls:
            launchMode === "two-step"
              ? {
                  deployHarness: encodeFunctionData(deployCall),
                  configureFundAndStart: encodeFunctionData(configureCall)
                }
              : {
                  launchSovereignCompressed: encodeFunctionData(compressedCall)
                },
          monitor: {
            receiver: predictedHarness,
            sender: launchMode === "two-step" ? predictedHarness : owner,
            submittedHashHint:
              launchMode === "two-step"
                ? "Use the configureFundAndStart tx hash with pnpm ritual:sovereign:result <harness> <configureTxHash>."
                : "Use the launchSovereignCompressed tx hash with pnpm ritual:sovereign:result <harness> <txHash>."
          },
          notes:
            launchMode === "two-step"
              ? [
                  "Two-step mode is the canonical production route for Genesis observability.",
                  "With windowNumCalls=1 the harness still schedules the next window at the first wake. Stop the harness after the first callback to avoid duplicate Genesis jobs.",
                  "Upload the referenced HF files before broadcast: session path, artifacts prefix, and system prompt path."
                ]
              : [
                  "Compressed mode remains available for parity, but observability is weaker than the two-step harness path.",
                  "SOVEREIGN_ENCRYPTED_SECRETS_HEX must be an executor-key-encrypted blob including at least LLM_PROVIDER and HF_TOKEN."
                ]
        },
        null,
        2
      )
    );
    return;
  }

  if (launchMode === "compressed") {
    const totalValue = dkmsFunding + schedulerFunding;
    const hash = await walletClient.writeContract({
      ...compressedCall,
      value: totalValue,
      gas: 5_000_000n,
      account
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    console.log(
      JSON.stringify(
        {
          mode: "broadcast",
          launchMode,
          owner,
          predictedHarness,
          txHash: hash,
          receiptStatus: receipt.status,
          receiptBlockNumber: receipt.blockNumber.toString(),
          receiver: predictedHarness
        },
        null,
        2
      )
    );
    return;
  }

  const predictedCode = await publicClient.getCode({ address: predictedHarness });
  let deployTxHash: `0x${string}` | null = null;
  let deployReceipt:
    | {
        status: "success" | "reverted";
        blockNumber: string;
      }
    | null = null;

  if (!predictedCode || predictedCode === "0x") {
    deployTxHash = await walletClient.writeContract({
      ...deployCall,
      gas: 3_000_000n,
      account
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: deployTxHash });
    deployReceipt = {
      status: receipt.status,
      blockNumber: receipt.blockNumber.toString()
    };
    const postDeployCode = await publicClient.getCode({ address: predictedHarness });
    if (!postDeployCode || postDeployCode === "0x") {
      throw new Error(`deployHarness tx ${deployTxHash} mined but no bytecode exists at predicted harness ${predictedHarness}. Aborting before configure.`);
    }
  }

  const configureTxHash = await walletClient.writeContract({
    ...configureCall,
    value: schedulerFunding,
    gas: optionalBigInt("SOVEREIGN_CONFIGURE_GAS_LIMIT", 3_500_000n),
    account
  });
  const configureReceipt = await publicClient.waitForTransactionReceipt({ hash: configureTxHash });

  console.log(
    JSON.stringify(
      {
        mode: "broadcast",
        launchMode,
        owner,
        predictedHarness,
        deployTxHash,
        deployReceipt,
        configureTxHash,
        configureReceipt: {
          status: configureReceipt.status,
          blockNumber: configureReceipt.blockNumber.toString()
        },
        receiver: predictedHarness,
        monitorCommand: `pnpm ritual:sovereign:result ${predictedHarness} ${configureTxHash}`,
        nextAction: "Wait for JobAdded/ResultDelivered on AsyncJobTracker, then stop the harness after the first callback."
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
