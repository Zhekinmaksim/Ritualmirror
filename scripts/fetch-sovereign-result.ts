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
  parseAbiParameters
} from "viem";
import { mirrorProfileSchema, ritualSystemAddresses, ritualTestnet, asyncJobTrackerAbi } from "@ritual-mirror/ritual";

const harnessArg = process.argv[2];
const jobId = process.argv[3] as `0x${string}` | undefined;
const outputPath = process.argv[4];

if (!harnessArg || !jobId) {
  console.error("Usage: pnpm ritual:sovereign:result <harness> <jobId> [output-json-file]");
  process.exit(1);
}
if (!isAddress(harnessArg)) {
  console.error("Harness must be a valid address.");
  process.exit(1);
}
if (!isHex(jobId)) {
  console.error("jobId must be 0x hex.");
  process.exit(1);
}

const client = createPublicClient({
  chain: ritualTestnet,
  transport: http(process.env.RITUAL_RPC_URL ?? "https://rpc.ritualfoundation.org")
});

const sovereignResultEvent = parseAbiItem("event SovereignResult(bytes32 indexed jobId, bytes result)");
const sovereignDirectResultEvent = parseAbiItem("event SovereignAgentResultDelivered(bytes32 indexed jobId, bytes result)");
const resultParams = parseAbiParameters(
  "bool, string, string, (string,string,string), (string,string,string), (string,string,string)[]"
);
const jobAddedEvent = parseAbiItem(
  "event JobAdded(address indexed executor, bytes32 indexed jobId, address indexed precompileAddress, uint256 commitBlock, bytes precompileInput, address senderAddress, bytes32 previousBlockHash, uint256 previousBlockNumber, uint256 previousBlockTimestamp, uint256 ttl, uint256 createdAt)"
);
const trackerEvent = parseAbiItem("event ResultDelivered(bytes32 indexed jobId, address indexed target, bool success)");
const jobRemovedEvent = parseAbiItem("event JobRemoved(address indexed executor, bytes32 indexed jobId, bool indexed completed)");

async function main() {
  const harness = getAddress(harnessArg);
  const [phase1Settled, addedLogs, deliveryLogs, removedLogs, harnessResultLogs, directResultLogs] = await Promise.all([
    client.readContract({
      address: ritualSystemAddresses.asyncJobTracker,
      abi: asyncJobTrackerAbi,
      functionName: "isPhase1Settled",
      args: [jobId]
    }),
    client.getLogs({
      address: ritualSystemAddresses.asyncJobTracker,
      event: jobAddedEvent,
      args: { jobId }
    }),
    client.getLogs({
      address: ritualSystemAddresses.asyncJobTracker,
      event: trackerEvent,
      args: { jobId }
    }),
    client.getLogs({
      address: ritualSystemAddresses.asyncJobTracker,
      event: jobRemovedEvent,
      args: { jobId }
    }),
    client.getLogs({
      address: harness,
      event: sovereignResultEvent,
      args: { jobId }
    }),
    client.getLogs({
      address: harness,
      event: sovereignDirectResultEvent,
      args: { jobId }
    })
  ]);

  const delivery = deliveryLogs.at(-1);
  const jobAdded = addedLogs.at(-1);
  const jobRemoved = removedLogs.at(-1);
  const harnessResultLog = harnessResultLogs.at(-1);
  const directResultLog = directResultLogs.at(-1);
  const resultLog = harnessResultLog ?? directResultLog;

  if (!resultLog) {
    console.log(
      JSON.stringify(
        {
          jobId,
          harness,
          jobAdded: jobAdded
            ? {
                executor: jobAdded.args.executor,
                precompileAddress: jobAdded.args.precompileAddress,
                commitBlock: jobAdded.args.commitBlock?.toString()
              }
            : null,
          phase1Settled,
          delivered: !!delivery,
          deliverySuccess: delivery?.args.success ?? null,
          removed: !!jobRemoved,
          removedCompleted: jobRemoved?.args.completed ?? null,
          eventSource: resultLog ? (harnessResultLog ? "harness" : "direct-receiver") : null,
          status: delivery
            ? "delivery-without-harness-event"
            : jobRemoved
              ? jobRemoved.args.completed
                ? "removed-completed-without-harness-event"
                : "removed-failed"
              : phase1Settled
                ? "phase1-settled"
                : jobAdded
                  ? "job-added"
                  : "pending"
        },
        null,
        2
      )
    );
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

  const payload = {
    jobId,
    harness,
    phase1Settled,
    jobAdded: jobAdded
      ? {
          executor: jobAdded.args.executor,
          precompileAddress: jobAdded.args.precompileAddress,
          commitBlock: jobAdded.args.commitBlock?.toString()
        }
      : null,
    delivered: !!delivery,
    deliverySuccess: delivery?.args.success ?? null,
    removed: !!jobRemoved,
    removedCompleted: jobRemoved?.args.completed ?? null,
    success,
    error,
    textResponse,
    parseError,
    profile: parsedProfile,
    updatedConvoHistory,
    updatedOutput,
    artifacts
  };

  if (outputPath && parsedProfile) {
    writeFileSync(outputPath, JSON.stringify(parsedProfile, null, 2));
  }

  console.log(JSON.stringify(payload, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
