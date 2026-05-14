import { writeFileSync } from "node:fs";
import { ECIES_CONFIG, encrypt } from "eciesjs";
import { createPublicClient, http } from "viem";
import { requireEnv } from "./_ritual-operator";
import { ritualSystemAddresses, ritualTestnet, teeServiceRegistryAbi } from "@ritual-mirror/ritual";

ECIES_CONFIG.symmetricNonceLength = 12;

type Provider = "anthropic" | "openai" | "gemini" | "openrouter" | "xai" | "ritual";

function providerKeyName(provider: Exclude<Provider, "ritual">) {
  switch (provider) {
    case "anthropic":
      return "ANTHROPIC_API_KEY";
    case "openai":
      return "OPENAI_API_KEY";
    case "gemini":
      return "GEMINI_API_KEY";
    case "openrouter":
      return "OPENROUTER_API_KEY";
    case "xai":
      return "XAI_API_KEY";
  }
}

function parseProvider(value: string | undefined, fallback: Provider): Provider {
  const normalized = (value ?? fallback).toLowerCase();
  if (
    normalized === "anthropic" ||
    normalized === "openai" ||
    normalized === "gemini" ||
    normalized === "openrouter" ||
    normalized === "xai" ||
    normalized === "ritual"
  ) {
    return normalized;
  }

  throw new Error(`Unsupported provider: ${value}`);
}

function encryptJson(publicKey: `0x${string}`, payload: Record<string, string>) {
  const buffer = encrypt(publicKey.slice(2), Buffer.from(JSON.stringify(payload), "utf8"));
  return `0x${buffer.toString("hex")}` as const;
}

function buildSovereignSecrets(): Record<string, string> {
  const provider = parseProvider(process.env.SOVEREIGN_LLM_PROVIDER, "ritual");
  const payload: Record<string, string> = {
    LLM_PROVIDER: provider,
    HF_TOKEN: requireEnv("HF_TOKEN")
  };

  if (provider !== "ritual") {
    const keyName = providerKeyName(provider);
    payload[keyName] = requireEnv(keyName);
  }

  return payload;
}

function buildPersistentSecrets(): Record<string, string> {
  const provider = parseProvider(process.env.PERSISTENT_LLM_PROVIDER, "anthropic");
  if (provider === "ritual") {
    throw new Error("Persistent Agent does not support provider=ritual. Use anthropic/openai/gemini/openrouter/xai.");
  }

  const keyName = providerKeyName(provider);
  return {
    HF_TOKEN: requireEnv("HF_TOKEN"),
    [keyName]: requireEnv(keyName)
  };
}

async function main() {
  const publicClient = createPublicClient({
    chain: ritualTestnet,
    transport: http(process.env.RITUAL_RPC_URL ?? "https://rpc.ritualfoundation.org")
  });
  const services = await publicClient.readContract({
    address: ritualSystemAddresses.teeServiceRegistry,
    abi: teeServiceRegistryAbi,
    functionName: "getServicesByCapability",
    args: [0, true]
  });
  const selected = services[0];
  if (!selected) throw new Error("No valid HTTP_CALL executor found in TEEServiceRegistry.");
  const executor = {
    teeAddress: selected.node.teeAddress,
    publicKey: selected.node.publicKey as `0x${string}`,
    paymentAddress: selected.node.paymentAddress
  };
  const sovereignSecrets = buildSovereignSecrets();
  const persistentSecrets = buildPersistentSecrets();

  const sovereignHex = encryptJson(executor.publicKey, sovereignSecrets);
  const persistentHex = encryptJson(executor.publicKey, persistentSecrets);

  const output = {
    executor: {
      teeAddress: executor.teeAddress,
      publicKey: executor.publicKey,
      paymentAddress: executor.paymentAddress
    },
    sovereign: {
      provider: sovereignSecrets.LLM_PROVIDER,
      encryptedHex: sovereignHex
    },
    persistent: {
      provider: parseProvider(process.env.PERSISTENT_LLM_PROVIDER, "anthropic"),
      encryptedHex: persistentHex
    }
  };

  if (process.env.WRITE_ENV_FILE === "1") {
    writeFileSync(
      ".ritual-secrets.generated.env",
      [
        `SOVEREIGN_ENCRYPTED_SECRETS_HEX=${sovereignHex}`,
        `PERSISTENT_ENCRYPTED_SECRETS_HEX=${persistentHex}`
      ].join("\n") + "\n",
      "utf8"
    );
  }

  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
