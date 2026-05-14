"use client";

import type { Hex } from "viem";
import type { MirrorGenesisPayload } from "@ritual-mirror/ritual";

const STORAGE_KEY = "ritual-mirror/create-session/v1";

export type RitualCreateSession = {
  payload?: MirrorGenesisPayload;
  payloadJson?: string;
  metadataURI?: string;
  genesisTxHash?: Hex;
  spawnTxHash?: Hex;
  workspaceURI?: string;
  daProvider?: "hf" | "gcs" | "pinata";
};

function canUseStorage() {
  return typeof window !== "undefined" && !!window.sessionStorage;
}

export function readCreateSession(): RitualCreateSession | undefined {
  if (!canUseStorage()) return undefined;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return undefined;

  try {
    return JSON.parse(raw) as RitualCreateSession;
  } catch {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return undefined;
  }
}

export function writeCreateSession(next: RitualCreateSession) {
  if (!canUseStorage()) return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function patchCreateSession(patch: Partial<RitualCreateSession>) {
  const current = readCreateSession() ?? {};
  writeCreateSession({ ...current, ...patch });
}
