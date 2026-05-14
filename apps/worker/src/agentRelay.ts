import { getMirrorStatus } from "./mirrorStatus";

export type ChatRequest = {
  address: string;
  question: string;
};

export type ChatResponse =
  | {
      status: "online";
      answer: string;
      provenance: string;
    }
  | {
      status: "offline";
    reason: string;
    };

export async function askPersistentMirror({ address, question }: ChatRequest): Promise<ChatResponse> {
  if (!question.trim()) {
    return {
      status: "offline",
      reason: "Question is empty."
    };
  }

  const status = await getMirrorStatus(address);
  if (!status.recordExists) {
    return {
      status: "offline",
      reason: "No registry record exists for this address."
    };
  }

  if (!status.agent.launcher) {
    return {
      status: "offline",
      reason: "Persistent launcher is not stored yet."
    };
  }

  if (!status.relayConfigured) {
    return {
      status: "offline",
      reason: "Persistent launcher is stored, but worker relay transport is not implemented yet."
    };
  }

  return {
    status: "offline",
    reason: "Relay transport is unavailable."
  };
}
