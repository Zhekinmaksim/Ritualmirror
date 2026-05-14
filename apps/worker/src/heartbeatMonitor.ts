export type AgentHeartbeatStatus = {
  launcher?: string;
  online: boolean;
  lastSeenBlock?: bigint;
  diagnostics: string[];
};

export async function checkHeartbeat(launcher?: string, online = false): Promise<AgentHeartbeatStatus> {
  return {
    launcher,
    online,
    diagnostics: launcher
      ? ["Heartbeat check is not wired to AgentHeartbeat yet."]
      : ["No Persistent Agent launcher is stored for this Mirror."]
  };
}
