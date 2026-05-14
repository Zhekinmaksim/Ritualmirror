import type { MirrorGenesisInput, MirrorProfile } from "./schemas";

export type GenesisJobRequest = {
  owner: `0x${string}`;
  input: MirrorGenesisInput;
  callbackTarget: `0x${string}`;
  callbackSelector: `0x${string}`;
};

export type PersistentMirrorConfig = {
  owner: `0x${string}`;
  profile: MirrorProfile;
  daProvider: "hf" | "pinata" | "gcs";
  workspaceUri: string;
};

export const requiredAgentFiles = [
  "SOUL.md",
  "IDENTITY.md",
  "MEMORY.md",
  "TOOLS.md"
] as const;
