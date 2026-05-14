import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createPublicClient, createWalletClient, getAddress, hexToBytes, http, isHex, zeroAddress, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ritualSystemAddresses, ritualTestnet, teeServiceRegistryAbi } from "@ritual-mirror/ritual";

function applyEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;

  const source = readFileSync(filePath, "utf8");
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator <= 0) continue;

    const key = line.slice(0, separator).trim();
    if (!key || process.env[key] !== undefined) continue;

    let value = line.slice(separator + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

for (const candidate of [resolve(process.cwd(), ".env.local"), resolve(process.cwd(), ".env")]) {
  applyEnvFile(candidate);
}

export function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

export function optionalBigInt(name: string, fallback: bigint) {
  const value = process.env[name];
  return value ? BigInt(value) : fallback;
}

export function optionalNumber(name: string, fallback: number) {
  const value = process.env[name];
  return value ? Number(value) : fallback;
}

export function optionalHex(name: string) {
  const value = process.env[name];
  if (!value) return undefined;
  if (!isHex(value)) throw new Error(`${name} must be 0x-prefixed hex.`);
  return value as Hex;
}

export function loadJsonFile<T>(path: string) {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export function buildClients() {
  const rpcUrl = process.env.RITUAL_RPC_URL ?? "https://rpc.ritualfoundation.org";
  const privateKey = requireEnv("PRIVATE_KEY") as Hex;
  const account = privateKeyToAccount(privateKey);
  const transport = http(rpcUrl);

  return {
    rpcUrl,
    account,
    publicClient: createPublicClient({
      chain: ritualTestnet,
      transport
    }),
    walletClient: createWalletClient({
      account,
      chain: ritualTestnet,
      transport
    })
  };
}

export async function selectHttpExecutor() {
  const { publicClient } = buildClients();
  const services = await publicClient.readContract({
    address: ritualSystemAddresses.teeServiceRegistry,
    abi: teeServiceRegistryAbi,
    functionName: "getServicesByCapability",
    args: [0, true]
  });

  const executor = services[0];
  if (!executor) {
    throw new Error("No valid HTTP_CALL executor found in TEEServiceRegistry.");
  }

  return {
    teeAddress: executor.node.teeAddress,
    publicKey: executor.node.publicKey,
    paymentAddress: executor.node.paymentAddress
  };
}

export function parseEncryptedSecretHex(name: string) {
  const hex = requireEnv(name);
  if (!isHex(hex)) throw new Error(`${name} must be a 0x-prefixed ECIES ciphertext blob.`);
  return hex as Hex;
}

export function requireAddressEnv(name: string) {
  const value = requireEnv(name);
  return getAddress(value);
}

export function maybeBroadcast() {
  return process.env.BROADCAST === "1";
}

export function summarizeHex(hex: Hex) {
  return `${hex.slice(0, 10)}...${hex.slice(-8)}`;
}

export function zeroOrAddress(value?: string) {
  return value ? getAddress(value) : zeroAddress;
}

export function ensureBytes(hex: Hex) {
  return hexToBytes(hex);
}
