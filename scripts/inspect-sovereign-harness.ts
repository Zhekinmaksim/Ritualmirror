import "./_ritual-operator";
import {
  createPublicClient,
  formatEther,
  getAddress,
  http,
  isAddress,
  parseAbiItem
} from "viem";
import {
  ritualSystemAddresses,
  ritualTestnet,
  ritualWalletAbi,
  schedulerAbi,
  sovereignHarnessAbi
} from "@ritual-mirror/ritual";

const harnessArg = process.argv[2];

if (!harnessArg || !isAddress(harnessArg)) {
  console.error("Usage: pnpm ritual:sovereign:harness <harness-address>");
  process.exit(1);
}

const client = createPublicClient({
  chain: ritualTestnet,
  transport: http(process.env.RITUAL_RPC_URL ?? "https://rpc.ritualfoundation.org")
});

const sovereignInvokedEvent = parseAbiItem("event SovereignInvoked(uint256 indexed executionIndex, uint64 indexed seriesId, bytes output)");
const sovereignResultEvent = parseAbiItem("event SovereignResult(bytes32 indexed jobId, bytes result)");

const callScheduledEvent = parseAbiItem(
  "event CallScheduled(uint256 indexed callId, address indexed schedulerContract, address indexed caller, uint32 startBlock, uint32 numCalls, uint32 frequency, uint32 gas, uint32 ttl, uint256 maxFeePerGas, uint256 maxPriorityFeePerGas, uint256 value)"
);

const callStateNames = ["SCHEDULED", "EXECUTING", "COMPLETED", "CANCELLED", "EXPIRED"] as const;
const wakeModeNames = ["NONE", "ROLLING_FIXED_WINDOW"] as const;

async function safeRead<T>(fn: () => Promise<T>, fallback: T) {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

function readCallField<T>(call: unknown, key: string, index: number) {
  const record = call as Record<string, T> & T[];
  return record?.[key] ?? record?.[index];
}

async function main() {
  const harness = getAddress(harnessArg);
  const code = await client.getCode({ address: harness });
  if (!code || code === "0x") {
    console.log(
      JSON.stringify(
        {
          harness,
          exists: false,
          reason: "no-bytecode-at-address"
        },
        null,
        2
      )
    );
    return;
  }

  const [currentBlock, nativeBalance, harnessWalletBalance, owner, configured, wakeMode, activeCallId, activeNumCalls, currentSeriesId, pendingSeriesId, pendingCallId, thresholdIndex] =
    await Promise.all([
      client.getBlockNumber(),
      client.getBalance({ address: harness }),
      safeRead(
        () =>
          client.readContract({
            address: ritualSystemAddresses.ritualWallet,
            abi: ritualWalletAbi,
            functionName: "balanceOf",
            args: [harness]
          }),
        0n
      ),
      client.readContract({ address: harness, abi: sovereignHarnessAbi, functionName: "owner" }),
      client.readContract({ address: harness, abi: sovereignHarnessAbi, functionName: "configured" }),
      client.readContract({ address: harness, abi: sovereignHarnessAbi, functionName: "wakeMode" }),
      client.readContract({ address: harness, abi: sovereignHarnessAbi, functionName: "activeCallId" }),
      client.readContract({ address: harness, abi: sovereignHarnessAbi, functionName: "activeNumCalls" }),
      client.readContract({ address: harness, abi: sovereignHarnessAbi, functionName: "currentSeriesId" }),
      client.readContract({ address: harness, abi: sovereignHarnessAbi, functionName: "pendingSeriesId" }),
      client.readContract({ address: harness, abi: sovereignHarnessAbi, functionName: "pendingCallId" }),
      client.readContract({ address: harness, abi: sovereignHarnessAbi, functionName: "thresholdIndex" })
    ]);

  const [schedulerCall, schedulerState, scheduledLogs, invokedLogs, resultLogs] = await Promise.all([
    activeCallId > 0n
      ? safeRead(
          () =>
            client.readContract({
              address: ritualSystemAddresses.scheduler,
              abi: schedulerAbi,
              functionName: "calls",
              args: [activeCallId]
            }),
          null
        )
      : Promise.resolve(null),
    activeCallId > 0n
      ? safeRead(
          () =>
            client.readContract({
              address: ritualSystemAddresses.scheduler,
              abi: schedulerAbi,
              functionName: "getCallState",
              args: [activeCallId]
            }),
          null
        )
      : Promise.resolve(null),
    activeCallId > 0n
      ? safeRead(
          () =>
            client.getLogs({
              address: ritualSystemAddresses.scheduler,
              event: callScheduledEvent,
              args: { callId: activeCallId },
              fromBlock: currentBlock > 200_000n ? currentBlock - 200_000n : 0n
            }),
          []
        )
      : Promise.resolve([]),
    safeRead(
      () =>
        client.getLogs({
          address: harness,
          event: sovereignInvokedEvent,
          fromBlock: currentBlock > 200_000n ? currentBlock - 200_000n : 0n
        }),
      []
    ),
    safeRead(
      () =>
        client.getLogs({
          address: harness,
          event: sovereignResultEvent,
          fromBlock: currentBlock > 200_000n ? currentBlock - 200_000n : 0n
        }),
      []
    )
  ]);

  const scheduledLog = scheduledLogs.at(-1) ?? null;
  const lastInvoked = invokedLogs.at(-1) ?? null;
  const lastResult = resultLogs.at(-1) ?? null;

  console.log(
    JSON.stringify(
      {
        harness,
        exists: true,
        codeSize: (code.length - 2) / 2,
        currentBlock: currentBlock.toString(),
        owner,
        configured,
        wakeMode: {
          value: Number(wakeMode),
          name: wakeModeNames[Number(wakeMode)] ?? "UNKNOWN"
        },
        activeCallId: activeCallId.toString(),
        activeNumCalls,
        currentSeriesId: currentSeriesId.toString(),
        pendingSeriesId: pendingSeriesId.toString(),
        pendingCallId: pendingCallId.toString(),
        thresholdIndex,
        balances: {
          native: `${formatEther(nativeBalance)} RITUAL`,
          ritualWallet: `${formatEther(harnessWalletBalance)} RITUAL`
        },
        scheduler:
          activeCallId > 0n
            ? {
                state: schedulerState === null ? null : { value: Number(schedulerState), name: callStateNames[Number(schedulerState)] ?? "UNKNOWN" },
                call:
                  schedulerCall === null
                    ? null
                    : {
                        to: readCallField<string>(schedulerCall, "to", 0),
                        caller: readCallField<string>(schedulerCall, "caller", 1),
                        startBlock: readCallField<number>(schedulerCall, "startBlock", 2),
                        numCalls: readCallField<number>(schedulerCall, "numCalls", 3),
                        frequency: readCallField<number>(schedulerCall, "frequency", 4),
                        gas: readCallField<number>(schedulerCall, "gas", 5),
                        ttl: readCallField<number>(schedulerCall, "ttl", 6),
                        state: readCallField<number>(schedulerCall, "state", 7),
                        maxFeePerGas: readCallField<bigint>(schedulerCall, "maxFeePerGas", 8)?.toString?.() ?? null,
                        maxPriorityFeePerGas:
                          readCallField<bigint>(schedulerCall, "maxPriorityFeePerGas", 9)?.toString?.() ?? null,
                        value: readCallField<bigint>(schedulerCall, "value", 10)?.toString?.() ?? null
                      },
                scheduledLog: scheduledLog
                  ? {
                      txHash: scheduledLog.transactionHash,
                      blockNumber: scheduledLog.blockNumber?.toString(),
                      startBlock: scheduledLog.args.startBlock,
                      numCalls: scheduledLog.args.numCalls,
                      frequency: scheduledLog.args.frequency,
                      ttl: scheduledLog.args.ttl
                    }
                  : null
              }
            : null,
        invoked: {
          count: invokedLogs.length,
          last: lastInvoked
            ? {
                executionIndex: lastInvoked.args.executionIndex?.toString(),
                seriesId: lastInvoked.args.seriesId?.toString(),
                txHash: lastInvoked.transactionHash,
                blockNumber: lastInvoked.blockNumber?.toString()
              }
            : null
        },
        results: {
          count: resultLogs.length,
          last: lastResult
            ? {
                jobId: lastResult.args.jobId,
                txHash: lastResult.transactionHash,
                blockNumber: lastResult.blockNumber?.toString()
              }
            : null
        }
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
