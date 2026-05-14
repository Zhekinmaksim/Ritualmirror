import { keccak256, stringToHex } from "viem";
import type { MirrorGenesisPayload } from "./genesis";

export type StorageRef = {
  platform: "hf" | "gcs" | "pinata" | "inline" | "";
  path: string;
  keyRef: string;
};

export type SovereignAgentParams = {
  executor: `0x${string}`;
  ttl: bigint;
  userPublicKey: `0x${string}`;
  pollIntervalBlocks: bigint;
  maxPollBlock: bigint;
  taskIdMarker: string;
  deliveryTarget: `0x${string}`;
  deliverySelector: `0x${string}`;
  deliveryGasLimit: bigint;
  deliveryMaxFeePerGas: bigint;
  deliveryMaxPriorityFeePerGas: bigint;
  cliType: number;
  prompt: string;
  encryptedSecrets: `0x${string}`;
  convoHistory: StorageRef;
  output: StorageRef;
  skills: StorageRef[];
  systemPrompt: StorageRef;
  model: string;
  tools: string[];
  maxTurns: number;
  maxTokens: number;
  rpcUrls: string;
};

export type SovereignScheduleConfig = {
  schedulerGas: number;
  frequency: number;
  schedulerTtl: number;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  value: bigint;
};

export type SovereignRollingConfig = {
  windowNumCalls: number;
  rolloverThresholdBps: number;
  rolloverRetryEveryCalls: number;
};

export type PersistentLaunchSchedule = {
  schedulerGas: number;
  schedulerTtl: number;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  value: bigint;
};

export type PersistentProvider = "anthropic" | "openai" | "gemini" | "xai" | "openrouter";

export const emptyStorageRef = (): StorageRef => ({
  platform: "",
  path: "",
  keyRef: ""
});

export const hfStorageRef = (path: string, keyRef = "HF_TOKEN"): StorageRef => ({
  platform: "hf",
  path,
  keyRef
});

export const mirrorUserSalt = (owner: `0x${string}`, label = "ritual-mirror"): `0x${string}` =>
  keccak256(stringToHex(`${label}:${owner.toLowerCase()}`));

export const defaultSovereignSchedule = (): SovereignScheduleConfig => ({
  schedulerGas: 3_000_000,
  frequency: 2_000,
  schedulerTtl: 500,
  maxFeePerGas: 0n,
  maxPriorityFeePerGas: 0n,
  value: 0n
});

export const defaultSovereignRolling = (): SovereignRollingConfig => ({
  windowNumCalls: 5,
  rolloverThresholdBps: 5_000,
  rolloverRetryEveryCalls: 1
});

export const defaultPersistentSchedule = (): PersistentLaunchSchedule => ({
  schedulerGas: 8_000_000,
  schedulerTtl: 500,
  maxFeePerGas: 0n,
  maxPriorityFeePerGas: 0n,
  value: 0n
});

export function assertScheduleLifespan(config: SovereignScheduleConfig, windowNumCalls: number) {
  const lifespan = config.frequency * windowNumCalls;
  if (lifespan > 10_000) {
    throw new Error(`Scheduler lifespan exceeds Ritual MAX_LIFESPAN: ${lifespan} > 10000`);
  }
}

export function sovereignRepoRefs(owner: `0x${string}`, repoId: string) {
  const base = `ritual-mirror/${owner.toLowerCase()}`;
  return {
    convoHistory: hfStorageRef(`${repoId}/${base}/sessions/session.jsonl`),
    output: hfStorageRef(`${repoId}/${base}/artifacts/`),
    systemPrompt: hfStorageRef(`${repoId}/${base}/prompts/system.md`)
  };
}

export function persistentRepoRefs(owner: `0x${string}`, repoId: string) {
  const base = `ritual-mirror/${owner.toLowerCase()}`;
  return {
    daConfig: hfStorageRef(`${repoId}/${base}/manifest.json`),
    soulRef: hfStorageRef(`${repoId}/${base}/SOUL.md`),
    agentsRef: emptyStorageRef(),
    userRef: emptyStorageRef(),
    memoryRef: hfStorageRef(`${repoId}/${base}/MEMORY.md`),
    identityRef: hfStorageRef(`${repoId}/${base}/IDENTITY.md`),
    toolsRef: hfStorageRef(`${repoId}/${base}/TOOLS.md`),
    openclawConfigRef: emptyStorageRef()
  };
}

export function mirrorGenesisPrompt(payload: MirrorGenesisPayload) {
  return [
    "Generate a strict JSON object for a Ritual Mirror genesis profile.",
    "Return JSON only. No markdown. No commentary.",
    "Required keys:",
    "mirrorName, archetype, mission, strengths, blindSpots, ritualPrimitiveFit, voiceStyle, agentPrompt, memorySeed, nftTraits, shareText.",
    `Input payload: ${JSON.stringify(payload)}`
  ].join("\n");
}

export function ritualRpcMap(rpcUrl: string) {
  return JSON.stringify({ ritual: rpcUrl });
}

export function persistentProviderEnum(provider: PersistentProvider) {
  switch (provider) {
    case "anthropic":
      return 0;
    case "openai":
      return 1;
    case "gemini":
      return 2;
    case "xai":
      return 3;
    case "openrouter":
      return 4;
  }
}

export function persistentProviderKeyRef(provider: PersistentProvider) {
  switch (provider) {
    case "anthropic":
      return "ANTHROPIC_API_KEY";
    case "openai":
      return "OPENAI_API_KEY";
    case "gemini":
      return "GEMINI_API_KEY";
    case "xai":
      return "XAI_API_KEY";
    case "openrouter":
      return "OPENROUTER_API_KEY";
  }
}
