import { getAddress, isAddress, toFunctionSelector } from "viem";
import {
  defaultSovereignRolling,
  defaultSovereignSchedule,
  ritualRpcMap,
  sovereignHarnessAbi,
  sovereignRepoRefs,
  type MirrorGenesisPayload
} from "@ritual-mirror/ritual";
import {
  buildClients,
  loadJsonFile,
  optionalBigInt,
  optionalNumber,
  parseEncryptedSecretHex,
  requireEnv,
  selectHttpExecutor
} from "./_ritual-operator";

const DEFAULT_COMPACT_GENESIS_PROMPT =
  "Read the referenced system prompt and repository context. Return only the required Ritual Mirror genesis JSON object.";

async function main() {
  const harnessArg = process.argv[2];
  const payloadPath = process.argv[3] ?? ".tmp/genesis-live.json";
  if (!harnessArg || !isAddress(harnessArg)) {
    throw new Error("Usage: pnpm ritual:sovereign:diagnose-configure <harness> [payload-json-file]");
  }

  const harness = getAddress(harnessArg);
  const payload = loadJsonFile<MirrorGenesisPayload>(payloadPath);
  const { account, publicClient, rpcUrl } = buildClients();
  const owner = getAddress(payload.owner);
  if (owner !== account.address) {
    throw new Error(`Payload owner ${owner} does not match PRIVATE_KEY account ${account.address}.`);
  }

  const repoId = requireEnv("HF_REPO_ID");
  const executor = await selectHttpExecutor();
  const schedule = defaultSovereignSchedule();
  schedule.frequency = optionalNumber("SOVEREIGN_SCHEDULER_FREQUENCY", 2000);
  schedule.schedulerTtl = optionalNumber("SOVEREIGN_SCHEDULER_TTL", schedule.schedulerTtl);
  schedule.schedulerGas = optionalNumber("SOVEREIGN_SCHEDULER_GAS", schedule.schedulerGas);
  schedule.maxFeePerGas = optionalBigInt("SOVEREIGN_MAX_FEE_PER_GAS", 1_000_000_000n);
  schedule.maxPriorityFeePerGas = optionalBigInt("SOVEREIGN_MAX_PRIORITY_FEE_PER_GAS", 100_000_000n);

  const rolling = defaultSovereignRolling();
  rolling.windowNumCalls = optionalNumber("SOVEREIGN_WINDOW_NUM_CALLS", 1);
  rolling.rolloverThresholdBps = optionalNumber("SOVEREIGN_ROLLOVER_THRESHOLD_BPS", 10_000);
  rolling.rolloverRetryEveryCalls = optionalNumber("SOVEREIGN_ROLLOVER_RETRY_EVERY_CALLS", 1);

  const params = {
    executor: executor.teeAddress,
    ttl: BigInt(optionalNumber("SOVEREIGN_TTL", 500)),
    userPublicKey: "0x",
    pollIntervalBlocks: BigInt(optionalNumber("SOVEREIGN_POLL_INTERVAL_BLOCKS", 5)),
    maxPollBlock: BigInt(optionalNumber("SOVEREIGN_MAX_POLL_BLOCK", 6_000)),
    taskIdMarker: "RITUAL_MIRROR_GENESIS",
    deliveryTarget: harness,
    deliverySelector: toFunctionSelector("onSovereignAgentResult(bytes32,bytes)"),
    deliveryGasLimit: optionalBigInt("SOVEREIGN_DELIVERY_GAS_LIMIT", 3_000_000n),
    deliveryMaxFeePerGas: optionalBigInt("SOVEREIGN_DELIVERY_MAX_FEE_PER_GAS", 1_000_000_000n),
    deliveryMaxPriorityFeePerGas: optionalBigInt("SOVEREIGN_DELIVERY_MAX_PRIORITY_FEE_PER_GAS", 100_000_000n),
    cliType: optionalNumber("SOVEREIGN_CLI_TYPE", 6),
    prompt: process.env.SOVEREIGN_PROMPT ?? DEFAULT_COMPACT_GENESIS_PROMPT,
    encryptedSecrets: parseEncryptedSecretHex("SOVEREIGN_ENCRYPTED_SECRETS_HEX"),
    convoHistory: sovereignRepoRefs(owner, repoId).convoHistory,
    output: sovereignRepoRefs(owner, repoId).output,
    skills: [],
    systemPrompt: sovereignRepoRefs(owner, repoId).systemPrompt,
    model: process.env.MODEL ?? "zai-org/GLM-4.7-FP8",
    tools: [] as string[],
    maxTurns: optionalNumber("SOVEREIGN_MAX_TURNS", 1),
    maxTokens: optionalNumber("SOVEREIGN_MAX_TOKENS", 4096),
    rpcUrls: ritualRpcMap(rpcUrl)
  } as const;

  const value = optionalBigInt("SOVEREIGN_SCHEDULER_FUNDING_WEI", 0n);
  const args = [params, schedule, rolling, optionalBigInt("SOVEREIGN_SCHEDULER_LOCK_DURATION", 8_000n)] as const;

  try {
    const gas = await publicClient.estimateContractGas({
      address: harness,
      abi: sovereignHarnessAbi,
      functionName: "configureFundAndStart",
      args,
      account,
      value
    });
    console.log(
      JSON.stringify(
        {
          harness,
          owner,
          estimateOk: true,
          gas: gas.toString(),
          value: value.toString()
        },
        null,
        2
      )
    );
  } catch (error) {
    console.log(
      JSON.stringify(
        {
          harness,
          owner,
          estimateOk: false,
          value: value.toString(),
          error: error instanceof Error ? error.message : String(error)
        },
        null,
        2
      )
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
