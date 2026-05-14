import { getAddress, keccak256, stringToHex, type Hex } from "viem";
import { mirrorGenesisInputSchema, type MirrorGenesisInput } from "./schemas";
import { ritualTestnet } from "./chain";

export type MirrorGenesisPayload = {
  kind: "ritual-mirror/genesis";
  version: 1;
  chainId: typeof ritualTestnet.id;
  owner: `0x${string}`;
  profileHash: Hex;
  input: MirrorGenesisInput;
};

export type PersistentSpawnConfig = {
  owner: `0x${string}`;
  profileHash: Hex;
  workspaceURI: string;
  daProvider: "hf" | "gcs" | "pinata";
};

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function canonicalize(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value === null || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== "")
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, canonicalize(entry)])
  );
}

export function canonicalJson(value: JsonValue) {
  return JSON.stringify(canonicalize(value));
}

export function parseGenesisInput(input: unknown): MirrorGenesisInput {
  return mirrorGenesisInputSchema.parse(input);
}

export function createProfileHash(input: MirrorGenesisInput): Hex {
  return keccak256(stringToHex(canonicalJson(input as unknown as JsonValue)));
}

export function createGenesisPayload(owner: string, input: MirrorGenesisInput): MirrorGenesisPayload {
  const parsed = parseGenesisInput({ ...input, wallet: getAddress(input.wallet) });

  return {
    kind: "ritual-mirror/genesis",
    version: 1,
    chainId: ritualTestnet.id,
    owner: getAddress(owner),
    profileHash: createProfileHash(parsed),
    input: parsed
  };
}

export function createPersistentSpawnConfig(config: PersistentSpawnConfig) {
  return {
    owner: getAddress(config.owner),
    profileHash: config.profileHash,
    workspaceURI: config.workspaceURI.trim(),
    daProvider: config.daProvider
  };
}

export function createPersistentSpawnConfigHash(config: PersistentSpawnConfig): Hex {
  return keccak256(stringToHex(canonicalJson(createPersistentSpawnConfig(config) as unknown as JsonValue)));
}
