import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

type BroadcastTx = {
  contractName?: string;
  contractAddress?: string;
};

type BroadcastRun = {
  transactions?: BroadcastTx[];
};

function upsertEnvValue(filePath: string, key: string, value: string) {
  let source = "";
  try {
    source = readFileSync(filePath, "utf8");
  } catch {
    source = "";
  }

  const line = `${key}=${value}`;
  if (!source) {
    writeFileSync(filePath, `${line}\n`, "utf8");
    return;
  }

  if (new RegExp(`^${key}=`, "m").test(source)) {
    const next = source.replace(new RegExp(`^${key}=.*$`, "m"), line);
    writeFileSync(filePath, next.endsWith("\n") ? next : `${next}\n`, "utf8");
    return;
  }

  const suffix = source.endsWith("\n") ? "" : "\n";
  writeFileSync(filePath, `${source}${suffix}${line}\n`, "utf8");
}

function requiredAddress(run: BroadcastRun, contractName: string) {
  const tx = run.transactions?.find((entry) => entry.contractName === contractName && entry.contractAddress);
  if (!tx?.contractAddress) {
    throw new Error(`Contract ${contractName} not found in broadcast artifact.`);
  }
  return tx.contractAddress;
}

async function main() {
  const chainId = process.argv[2] ?? process.env.RITUAL_CHAIN_ID ?? "1979";
  const broadcastPath = resolve(process.cwd(), `broadcast/Deploy.s.sol/${chainId}/run-latest.json`);
  if (!existsSync(broadcastPath)) {
    throw new Error(`Broadcast artifact not found: ${broadcastPath}`);
  }

  const run = JSON.parse(readFileSync(broadcastPath, "utf8")) as BroadcastRun;
  const registry = requiredAddress(run, "RitualMirrorRegistry");
  const nft = requiredAddress(run, "RitualMirrorNFT");
  const sovereignConsumer = requiredAddress(run, "RitualMirrorSovereignConsumer");
  const agentManager = requiredAddress(run, "RitualMirrorAgentManager");

  const rootEnv = resolve(process.cwd(), ".env");
  const webEnv = resolve(process.cwd(), "apps/web/.env.local");

  for (const [key, value] of [
    ["REGISTRY_ADDRESS", registry],
    ["NFT_ADDRESS", nft],
    ["SOVEREIGN_CONSUMER_ADDRESS", sovereignConsumer],
    ["AGENT_MANAGER_ADDRESS", agentManager],
    ["NEXT_PUBLIC_REGISTRY_ADDRESS", registry],
    ["NEXT_PUBLIC_NFT_ADDRESS", nft],
    ["NEXT_PUBLIC_SOVEREIGN_CONSUMER_ADDRESS", sovereignConsumer],
    ["NEXT_PUBLIC_AGENT_MANAGER_ADDRESS", agentManager]
  ] as const) {
    upsertEnvValue(rootEnv, key, value);
  }

  for (const [key, value] of [
    ["NEXT_PUBLIC_REGISTRY_ADDRESS", registry],
    ["NEXT_PUBLIC_NFT_ADDRESS", nft],
    ["NEXT_PUBLIC_SOVEREIGN_CONSUMER_ADDRESS", sovereignConsumer],
    ["NEXT_PUBLIC_AGENT_MANAGER_ADDRESS", agentManager]
  ] as const) {
    upsertEnvValue(webEnv, key, value);
  }

  console.log(
    JSON.stringify(
      {
        broadcastPath,
        registry,
        nft,
        sovereignConsumer,
        agentManager
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
