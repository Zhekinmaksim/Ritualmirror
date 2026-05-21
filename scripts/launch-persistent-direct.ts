import {
  encodeAbiParameters,
  encodeFunctionData,
  getAddress,
  isAddress,
  parseAbi,
  parseAbiParameters,
  toFunctionSelector
} from "viem";
import {
  persistentProviderEnum,
  persistentProviderKeyRef,
  ritualSystemAddresses,
  ritualTestnet,
  type PersistentProvider
} from "@ritual-mirror/ritual";
import {
  buildClients,
  maybeBroadcast,
  optionalBigInt,
  optionalNumber,
  parseEncryptedSecretHex,
  requireEnv,
  selectHttpExecutor
} from "./_ritual-operator";

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

const consumerAbi = parseAbi([
  "function callPersistentAgent(bytes input) external returns (bytes)"
]);

function parseProvider(value: string): PersistentProvider {
  const lowered = value.toLowerCase();
  if (lowered === "anthropic" || lowered === "openai" || lowered === "gemini" || lowered === "xai" || lowered === "openrouter") {
    return lowered;
  }
  throw new Error(`Unsupported PERSISTENT_LLM_PROVIDER: ${value}`);
}

function inlineRef(content: string) {
  return content ? ["inline", content, ""] as const : ["", "", ""] as const;
}

function compactDoc(name: string, fallback: string) {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : fallback;
}

function parseAgentRuntime(value?: string) {
  const normalized = (value ?? "zeroclaw").trim().toLowerCase();
  if (normalized === "zeroclaw") return 0;
  if (normalized === "hermes") return 2;
  throw new Error(`Unsupported AGENT_RUNTIME: ${value}`);
}

function heartbeatRuntimeConfig(rpcUrl: string) {
  const config: Record<string, unknown> = {
    heartbeat_chain: {
      enabled: true,
      contract_address: ritualSystemAddresses.agentHeartbeat,
      rpc_url: rpcUrl,
      interval_blocks: optionalNumber("HEARTBEAT_CHAIN_INTERVAL_BLOCKS", 100),
      heartbeat_timeout_blocks: optionalNumber("HEARTBEAT_CHAIN_TIMEOUT_BLOCKS", 200)
    }
  };

  const heartbeatEvery = process.env.HEARTBEAT_INTERVAL?.trim();
  const heartbeatPrompt = process.env.HEARTBEAT_PROMPT?.trim();
  if (heartbeatEvery) {
    const heartbeat: Record<string, string> = {
      every: heartbeatEvery,
      target: "none"
    };
    if (heartbeatPrompt) {
      heartbeat.prompt = heartbeatPrompt;
    }
    config.agents = {
      defaults: {
        heartbeat
      }
    };
  }

  return JSON.stringify(config);
}

async function main() {
  const consumerArg = process.argv[2];
  if (!consumerArg || !isAddress(consumerArg)) {
    throw new Error("Usage: node --import tsx scripts/launch-persistent-direct.ts <consumer>");
  }

  const consumer = getAddress(consumerArg);
  const { account, walletClient, rpcUrl } = buildClients();
  const executor = await selectHttpExecutor();

  const repoId = requireEnv("HF_REPO_ID");
  const provider = parseProvider(requireEnv("PERSISTENT_LLM_PROVIDER"));
  const model = requireEnv("PERSISTENT_MODEL");
  const encryptedSecrets = parseEncryptedSecretHex("PERSISTENT_ENCRYPTED_SECRETS_HEX");
  const soul = compactDoc(
    "SOUL",
    "You are Ritual Mirror, a persistent on-chain agent for the owner. Be direct, technical, and concise."
  );
  const memory = compactDoc(
    "MEMORY_DOC",
    "Store decisions, active workstreams, and explicit follow-ups. Do not store secrets."
  );
  const identity = compactDoc(
    "IDENTITY_DOC",
    `Owner wallet: ${account.address}. Act only as this owner's Ritual Mirror.`
  );
  const tools = compactDoc(
    "TOOLS_DOC",
    "Use available Ritual-native tools carefully. Do not spend funds or claim affiliations."
  );
  const runtimeConfig = heartbeatRuntimeConfig(rpcUrl);
  const agentRuntime = parseAgentRuntime(process.env.AGENT_RUNTIME);

  const persistentInput = encodeAbiParameters(persistentAbiParams, [
    executor.teeAddress,
    [encryptedSecrets],
    BigInt(optionalNumber("PERSISTENT_TTL", 300)),
    [],
    "0x",
    BigInt(optionalNumber("PERSISTENT_MAX_SPAWN_BLOCK", 600)),
    consumer,
    toFunctionSelector("onPersistentAgentResult(bytes32,bytes)"),
    optionalBigInt("PERSISTENT_DELIVERY_GAS_LIMIT", 500_000n),
    optionalBigInt("PERSISTENT_DELIVERY_MAX_FEE_PER_GAS", 1_000_000_000n),
    optionalBigInt("PERSISTENT_DELIVERY_MAX_PRIORITY_FEE_PER_GAS", 100_000_000n),
    0n,
    persistentProviderEnum(provider),
    model,
    persistentProviderKeyRef(provider),
    ["hf", repoId, "HF_TOKEN"],
    inlineRef(soul),
    ["", "", ""],
    ["", "", ""],
    inlineRef(memory),
    inlineRef(identity),
    inlineRef(tools),
    inlineRef(runtimeConfig),
    "",
    JSON.stringify({ ritual: rpcUrl }),
    agentRuntime
  ]);

  const call = {
    address: consumer,
    abi: consumerAbi,
    functionName: "callPersistentAgent",
    args: [persistentInput] as const
  };

  if (!maybeBroadcast()) {
    const data = encodeFunctionData(call);
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          chainId: ritualTestnet.id,
          owner: account.address,
          consumer,
          executor,
          provider,
          model,
          agentRuntime,
          requestInput: persistentInput,
          calldata: data
        },
        null,
        2
      )
    );
    return;
  }

  const hash = await walletClient.writeContract({
    ...call,
    gas: 1_000_000n,
    account
  });

  console.log(
    JSON.stringify(
      {
        mode: "broadcast",
        owner: account.address,
        consumer,
        executor,
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
