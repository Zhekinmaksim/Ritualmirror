import "./_ritual-operator";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { getAddress, isAddress, isHex } from "viem";
import { maybeBroadcast } from "./_ritual-operator";

type JsonRecord = Record<string, unknown>;

function parseArgs() {
  const ownerArg = process.argv[2];
  const jobId = process.argv[3] as `0x${string}` | undefined;
  const receiverArg = process.argv[4];
  const profileHash = process.argv[5] as `0x${string}` | undefined;
  const metadataURI = process.argv[6];
  const payloadPath = process.argv[7] ?? ".tmp/genesis-live.json";
  const profilePath = process.argv[8] ?? ".tmp/genesis-profile-live.json";

  if (!ownerArg || !jobId || !receiverArg || !profileHash || !metadataURI) {
    throw new Error(
      "Usage: pnpm ritual:genesis:finalize <owner> <jobId> <receiver> <profileHash> <metadataURI> [payload-json] [profile-json]"
    );
  }
  if (!isAddress(ownerArg)) throw new Error("Owner must be a valid address.");
  if (!isAddress(receiverArg)) throw new Error("Receiver must be a valid address.");
  if (!isHex(jobId)) throw new Error("jobId must be 0x hex.");
  if (!isHex(profileHash)) throw new Error("profileHash must be 0x hex.");

  return {
    owner: getAddress(ownerArg),
    jobId,
    receiver: getAddress(receiverArg),
    profileHash,
    metadataURI,
    payloadPath,
    profilePath
  };
}

function parseJsonOutput(stdout: string) {
  const trimmed = stdout.trim();
  if (!trimmed) {
    throw new Error("Command returned empty stdout.");
  }

  try {
    return JSON.parse(trimmed) as JsonRecord;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as JsonRecord;
    }
    throw new Error(`Unable to parse JSON from stdout:\n${trimmed}`);
  }
}

function runJsonScript(scriptName: string, args: string[]) {
  const scriptPath = resolve(process.cwd(), "scripts", scriptName);
  const result = spawnSync("node", ["--import", "tsx", scriptPath, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: process.env
  });

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || `${scriptName} failed`);
  }

  return parseJsonOutput(result.stdout);
}

function shouldLaunchPersistent() {
  return process.env.FINALIZE_PERSISTENT !== "0";
}

function shouldStopHarness() {
  return process.env.FINALIZE_STOP_SOVEREIGN !== "0";
}

function main() {
  const { owner, jobId, receiver, profileHash, metadataURI, payloadPath, profilePath } = parseArgs();
  const broadcast = maybeBroadcast();

  const sovereignResult = runJsonScript("fetch-sovereign-result.ts", [receiver, jobId, profilePath]);
  const effectiveJobId =
    typeof sovereignResult.effectiveJobId === "string" ? sovereignResult.effectiveJobId : jobId;
  const delivered = sovereignResult.delivered === true;
  const success = sovereignResult.success === true;
  const hasProfile = !!sovereignResult.profile;

  if (!delivered || !success || !hasProfile) {
    console.log(
      JSON.stringify(
        {
          mode: broadcast ? "broadcast" : "dry-run",
          owner,
          submittedTxHash: jobId,
          effectiveJobId,
          receiver,
          profileHash,
          metadataURI,
          payloadPath,
          profilePath,
          finalized: false,
          step: "awaiting-genesis-result",
          sovereignResult
        },
        null,
        2
      )
    );
    process.exit(2);
  }

  let sovereignStop: JsonRecord | null = null;
  if (shouldStopHarness()) {
    sovereignStop = runJsonScript("stop-sovereign-harness.ts", [receiver]);
  }

  const hfSync = runJsonScript("sync-hf-workspace.ts", [owner, payloadPath, profilePath]);
  const workspaceURI = String(hfSync.workspaceURI);
  const genesisRecord = runJsonScript("record-genesis-result.ts", [owner, effectiveJobId, profileHash, metadataURI, workspaceURI]);

  let persistentLaunch: JsonRecord | null = null;
  let launcherRecord: JsonRecord | null = null;

  if (shouldLaunchPersistent()) {
    persistentLaunch = runJsonScript("launch-persistent-factory.ts", [owner, profileHash, workspaceURI]);
    const predictedLauncher = persistentLaunch.predictedLauncher;
    if (typeof predictedLauncher !== "string") {
      throw new Error("Persistent launch did not return predictedLauncher.");
    }
    launcherRecord = runJsonScript("record-persistent-launcher.ts", [owner, predictedLauncher, workspaceURI]);
  }

  console.log(
    JSON.stringify(
      {
        mode: broadcast ? "broadcast" : "dry-run",
        finalized: true,
        owner,
        submittedTxHash: jobId,
        effectiveJobId,
        receiver,
        profileHash,
        metadataURI,
        payloadPath,
        profilePath,
        workspaceURI,
        sovereignResult,
        sovereignStop,
        hfSync,
        genesisRecord,
        persistentLaunch,
        launcherRecord
      },
      null,
      2
    )
  );
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
