import { loadWebServerConfig } from "./config";
import { getMirrorStatus } from "./mirror-status";

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

type RelayMessage = {
  id?: string;
  content?: string;
  role?: string;
  createdAt?: string | number;
  timestamp?: string | number;
};

const config = loadWebServerConfig();

function normalizeRelayUrl(url: string) {
  return url.replace(/\/$/, "");
}

function messageIdentity(message: RelayMessage) {
  return message.id ?? `${message.createdAt ?? message.timestamp ?? ""}:${message.role ?? ""}:${message.content ?? ""}`;
}

function visibleRelayMessages(payload: unknown) {
  const messages = Array.isArray((payload as { messages?: unknown[] })?.messages)
    ? ((payload as { messages: unknown[] }).messages as RelayMessage[])
    : [];
  return messages.filter((message) => {
    const content = typeof message.content === "string" ? message.content : "";
    return content.trim() && !content.includes("HEARTBEAT_OK");
  });
}

async function relayJson(path: string, init?: RequestInit) {
  if (!config.relayUrl) {
    throw new Error("RELAY_URL is not configured.");
  }

  const response = await fetch(`${normalizeRelayUrl(config.relayUrl)}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Relay ${path} failed: ${response.status} ${body}`);
  }

  return response.json();
}

async function pollRelayReply(agentAddress: string, baseline: Set<string>) {
  const deadline = Date.now() + config.relayPollTimeoutMs;

  while (Date.now() < deadline) {
    const payload = await relayJson(`/replies/${agentAddress}`);
    const messages = visibleRelayMessages(payload);
    const next = messages.find((message) => !baseline.has(messageIdentity(message)));
    if (next?.content) {
      return next.content;
    }
    await new Promise((resolve) => setTimeout(resolve, config.relayPollIntervalMs));
  }

  throw new Error("Relay timed out waiting for agent reply.");
}

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
      reason: "Persistent launcher is stored, but RELAY_URL is not configured."
    };
  }

  try {
    const agentAddress = status.agent.launcher;
    const baselinePayload = await relayJson(`/replies/${agentAddress}`);
    const baseline = new Set(visibleRelayMessages(baselinePayload).map(messageIdentity));

    await relayJson(`/send/${agentAddress}`, {
      method: "POST",
      body: JSON.stringify({ message: question.trim() })
    });

    const answer = await pollRelayReply(agentAddress, baseline);

    return {
      status: "online",
      answer,
      provenance: config.relayUrl!
    };
  } catch (error) {
    return {
      status: "offline",
      reason: error instanceof Error ? error.message : "Relay transport is unavailable."
    };
  }
}
