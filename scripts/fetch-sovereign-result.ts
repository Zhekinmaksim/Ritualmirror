import "./_ritual-operator";
import { writeFileSync } from "node:fs";
import {
  createPublicClient,
  decodeAbiParameters,
  getAddress,
  http,
  isAddress,
  isHex,
  parseAbiItem,
  parseAbiParameters,
  type Address,
  type Hex
} from "viem";
import { buildClients } from "./_ritual-operator";
import { asyncJobTrackerAbi, mirrorProfileSchema, ritualSystemAddresses, ritualTestnet } from "@ritual-mirror/ritual";

const receiverArg = process.argv[2];
const submittedTxOrJobId = process.argv[3] as Hex | undefined;
const outputPath = process.argv[4];

if (!receiverArg || !submittedTxOrJobId) {
  console.error("Usage: pnpm ritual:sovereign:result <receiver> <submitted-tx-hash-or-job-id> [output-json-file]");
  process.exit(1);
}
if (!isAddress(receiverArg)) {
  console.error("Receiver must be a valid address.");
  process.exit(1);
}
if (!isHex(submittedTxOrJobId)) {
  console.error("submitted tx hash / jobId must be 0x hex.");
  process.exit(1);
}

const client = createPublicClient({
  chain: ritualTestnet,
  transport: http(process.env.RITUAL_RPC_URL ?? "https://rpc.ritualfoundation.org")
});

const sovereignPrecompile = "0x000000000000000000000000000000000000080C" as Address;
const sovereignResultEvent = parseAbiItem("event SovereignResult(bytes32 indexed jobId, bytes result)");
const sovereignDirectResultEvent = parseAbiItem("event SovereignAgentResultDelivered(bytes32 indexed jobId, bytes result)");
const resultParams = parseAbiParameters(
  "bool, string, string, (string,string,string), (string,string,string), (string,string,string)[]"
);
const jobAddedEvent = parseAbiItem(
  "event JobAdded(address indexed executor, bytes32 indexed jobId, address indexed precompileAddress, uint256 commitBlock, bytes precompileInput, address senderAddress, bytes32 previousBlockHash, uint256 previousBlockNumber, uint256 previousBlockTimestamp, uint256 ttl, uint256 createdAt)"
);
const trackerDeliveredEvent = parseAbiItem("event ResultDelivered(bytes32 indexed jobId, address indexed target, bool success)");
const jobRemovedEvent = parseAbiItem("event JobRemoved(address indexed executor, bytes32 indexed jobId, bool indexed completed)");

function normalizeHex(value?: Hex | string | null) {
  return value ? value.toLowerCase() : "";
}

async function readPhase1Settled(jobId: Hex) {
  try {
    return await client.readContract({
      address: ritualSystemAddresses.asyncJobTracker,
      abi: asyncJobTrackerAbi,
      functionName: "isPhase1Settled",
      args: [jobId]
    });
  } catch {
    return false;
  }
}

async function getPendingForSender(address?: Address) {
  if (!address) return null;
  try {
    return await client.readContract({
      address: ritualSystemAddresses.asyncJobTracker,
      abi: asyncJobTrackerAbi,
      functionName: "hasPendingJobForSender",
      args: [address]
    });
  } catch {
    return null;
  }
}

async function resolveEffectiveJob(submittedHash: Hex) {
  const tx = await client.getTransaction({ hash: submittedHash }).catch(() => null);
  const receipt = await client.getTransactionReceipt({ hash: submittedHash }).catch(() => null);
  let fallbackSender: Address | undefined;
  try {
    fallbackSender = buildClients().account.address;
  } catch {
    fallbackSender = undefined;
  }
  const sender = tx?.from ? getAddress(tx.from) : fallbackSender;
  const txInput = normalizeHex((tx as { input?: Hex; data?: Hex } | null)?.input ?? (tx as { data?: Hex } | null)?.data ?? null);
  const receiptBlock = receipt?.blockNumber;
  const latestBlock = await client.getBlockNumber().catch(() => 0n);
  const fromBlock = receiptBlock
    ? receiptBlock > 256n
      ? receiptBlock - 256n
      : 0n
    : latestBlock > 50_000n
      ? latestBlock - 50_000n
      : 0n;

  const directJobAddedLogs = await client.getLogs({
    address: ritualSystemAddresses.asyncJobTracker,
    event: jobAddedEvent,
    args: { jobId: submittedHash }
  });
  if (directJobAddedLogs.length > 0) {
    return {
      submittedTxHash: submittedHash,
      effectiveJobId: submittedHash,
      resolution: "direct-job-id",
      sender,
      tx,
      receipt,
      receiptBlock,
      matchedJobAdded: directJobAddedLogs.at(-1) ?? null,
      candidateCount: directJobAddedLogs.length
    };
  }

  const directCallbackLogs = await client.getLogs({
    address: getAddress(receiverArg),
    event: sovereignDirectResultEvent,
    args: { jobId: submittedHash }
  });
  if (directCallbackLogs.length > 0) {
    return {
      submittedTxHash: submittedHash,
      effectiveJobId: submittedHash,
      resolution: "direct-callback-job-id",
      sender,
      tx,
      receipt,
      receiptBlock,
      matchedJobAdded: null,
      candidateCount: directCallbackLogs.length
    };
  }

  const candidateJobAddedLogs = await client.getLogs({
    address: ritualSystemAddresses.asyncJobTracker,
    event: jobAddedEvent,
    args: { precompileAddress: sovereignPrecompile },
    fromBlock
  });

  const exactCandidates = candidateJobAddedLogs.filter((log) => {
    const logSender = log.args.senderAddress ? getAddress(log.args.senderAddress) : undefined;
    const logInput = normalizeHex(log.args.precompileInput);
    return !!sender && logSender === sender && !!txInput && logInput === txInput;
  });

  if (exactCandidates.length > 0) {
    const matched = exactCandidates.at(-1)!;
    return {
      submittedTxHash: submittedHash,
      effectiveJobId: matched.args.jobId as Hex,
      resolution: "matched-by-precompile-input",
      sender,
      tx,
      receipt,
      receiptBlock,
      matchedJobAdded: matched,
      candidateCount: exactCandidates.length
    };
  }

  const senderCandidates = candidateJobAddedLogs.filter((log) => {
    const logSender = log.args.senderAddress ? getAddress(log.args.senderAddress) : undefined;
    return !!sender && logSender === sender;
  });

  const receiverCandidates = candidateJobAddedLogs.filter((log) => {
    const logSender = log.args.senderAddress ? getAddress(log.args.senderAddress) : undefined;
    return logSender === getAddress(receiverArg) && (!receiptBlock || log.blockNumber >= receiptBlock);
  });

  if (receiverCandidates.length > 0) {
    const matched = receiverCandidates[0];
    return {
      submittedTxHash: submittedHash,
      effectiveJobId: matched.args.jobId as Hex,
      resolution: "matched-by-receiver-sender",
      sender,
      tx,
      receipt,
      receiptBlock,
      matchedJobAdded: matched,
      candidateCount: receiverCandidates.length
    };
  }

  if (senderCandidates.length === 1) {
    const matched = senderCandidates[0];
    return {
      submittedTxHash: submittedHash,
      effectiveJobId: matched.args.jobId as Hex,
      resolution: "matched-by-sender-singleton",
      sender,
      tx,
      receipt,
      receiptBlock,
      matchedJobAdded: matched,
      candidateCount: senderCandidates.length
    };
  }

  const latestSenderCandidate = senderCandidates.at(-1);
  if (latestSenderCandidate) {
    return {
      submittedTxHash: submittedHash,
      effectiveJobId: latestSenderCandidate.args.jobId as Hex,
      resolution: "matched-by-latest-sender",
      sender,
      tx,
      receipt,
      receiptBlock,
      matchedJobAdded: latestSenderCandidate,
      candidateCount: senderCandidates.length
    };
  }

  return {
    submittedTxHash: submittedHash,
    effectiveJobId: submittedHash,
    resolution: "unresolved",
    sender,
    tx,
    receipt,
    receiptBlock,
    matchedJobAdded: null,
    candidateCount: senderCandidates.length
  };
}

function summarizeJobAdded(log: Awaited<ReturnType<typeof resolveEffectiveJob>>["matchedJobAdded"]) {
  if (!log) return null;
  return {
    executor: log.args.executor,
    precompileAddress: log.args.precompileAddress,
    commitBlock: log.args.commitBlock?.toString(),
    senderAddress: log.args.senderAddress,
    createdAt: log.args.createdAt?.toString(),
    ttl: log.args.ttl?.toString(),
    commitmentTxHash: log.transactionHash,
    commitmentBlockNumber: log.blockNumber?.toString()
  };
}

async function main() {
  const receiver = getAddress(receiverArg);
  const resolution = await resolveEffectiveJob(submittedTxOrJobId);
  const effectiveJobId = resolution.effectiveJobId;

  const [phase1Settled, deliveryLogs, removedLogs, harnessResultLogs, directResultLogs, pendingForSender] = await Promise.all([
    readPhase1Settled(effectiveJobId),
    client.getLogs({
      address: ritualSystemAddresses.asyncJobTracker,
      event: trackerDeliveredEvent,
      args: { jobId: effectiveJobId }
    }),
    client.getLogs({
      address: ritualSystemAddresses.asyncJobTracker,
      event: jobRemovedEvent,
      args: { jobId: effectiveJobId }
    }),
    client.getLogs({
      address: receiver,
      event: sovereignResultEvent,
      args: { jobId: effectiveJobId }
    }),
    client.getLogs({
      address: receiver,
      event: sovereignDirectResultEvent,
      args: { jobId: effectiveJobId }
    }),
    getPendingForSender(resolution.sender)
  ]);

  const delivery = deliveryLogs.at(-1);
  const jobRemoved = removedLogs.at(-1);
  const harnessResultLog = harnessResultLogs.at(-1);
  const directResultLog = directResultLogs.at(-1);
  const resultLog = harnessResultLog ?? directResultLog;

  const basePayload = {
    submittedTxHash: resolution.submittedTxHash,
    effectiveJobId,
    resolution: resolution.resolution,
    candidateCount: resolution.candidateCount,
    receiver,
    sender: resolution.sender ?? null,
    receipt: resolution.receipt
      ? {
          blockNumber: resolution.receipt.blockNumber?.toString(),
          status: resolution.receipt.status,
          gasUsed: resolution.receipt.gasUsed?.toString()
        }
      : null,
    txFound: !!resolution.tx,
    txBlockNumber: resolution.receiptBlock?.toString() ?? null,
    jobAdded: summarizeJobAdded(resolution.matchedJobAdded),
    phase1Settled,
    delivered: !!delivery,
    deliverySuccess: delivery?.args.success ?? null,
    removed: !!jobRemoved,
    removedCompleted: jobRemoved?.args.completed ?? null,
    pendingForSender,
    callbackObserved: !!resultLog,
    eventSource: resultLog ? (harnessResultLog ? "harness" : "direct-receiver") : null
  };

  if (!resultLog) {
    const status = delivery
      ? "delivery-without-callback-event"
      : jobRemoved
        ? jobRemoved.args.completed
          ? "removed-completed-without-callback-event"
          : "removed-failed"
        : phase1Settled
          ? "phase1-settled"
          : resolution.matchedJobAdded
            ? "committed"
            : pendingForSender
              ? "submitted-pending-commitment"
              : resolution.receipt
                ? "submitted-no-commitment"
                : "unresolved";

    console.log(JSON.stringify({ ...basePayload, status }, null, 2));
    return;
  }

  const [success, error, textResponse, updatedConvoHistory, updatedOutput, artifacts] = decodeAbiParameters(
    resultParams,
    resultLog.args.result
  );

  let parsedProfile: unknown = null;
  let parseError: string | null = null;

  if (success && !error && textResponse) {
    try {
      parsedProfile = mirrorProfileSchema.parse(JSON.parse(textResponse));
    } catch (decodeError) {
      parseError = decodeError instanceof Error ? decodeError.message : String(decodeError);
    }
  }

  if (outputPath && parsedProfile) {
    writeFileSync(outputPath, JSON.stringify(parsedProfile, null, 2));
  }

  console.log(
    JSON.stringify(
      {
        ...basePayload,
        status: success ? "callback-delivered" : "callback-failed",
        success,
        error,
        textResponse,
        parseError,
        profile: parsedProfile,
        updatedConvoHistory,
        updatedOutput,
        artifacts
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
