import { createServer } from "node:http";
import { loadConfig } from "./config";
import { askPersistentMirror } from "./agentRelay";
import { checkHeartbeat } from "./heartbeatMonitor";
import { getMirrorStatus } from "./mirrorStatus";

const config = loadConfig();

function sendJson(res: import("node:http").ServerResponse, status: number, payload: unknown) {
  res.writeHead(status, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type"
  });
  res.end(JSON.stringify(payload));
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "OPTIONS") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && url.pathname === "/health") {
    sendJson(res, 200, { ok: true, chainId: 1979, rpcUrl: config.rpcUrl, relayUrl: config.relayUrl ?? null });
    return;
  }

  if (req.method === "GET" && url.pathname.startsWith("/mirror/") && url.pathname.endsWith("/status")) {
    const [, , address] = url.pathname.split("/");
    try {
      const status = await getMirrorStatus(address);
      const heartbeat = await checkHeartbeat(status.agent.launcher, status.agent.online);
      sendJson(res, 200, { ...status, heartbeat });
    } catch (error) {
      sendJson(res, 400, {
        status: "error",
        error: error instanceof Error ? error.message : "Status lookup failed."
      });
    }
    return;
  }

  if (req.method === "POST" && url.pathname.startsWith("/mirror/") && url.pathname.endsWith("/chat")) {
    const [, , address] = url.pathname.split("/");
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", async () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        const response = await askPersistentMirror({ address, question: String(parsed.question ?? "") });
        sendJson(res, response.status === "online" ? 200 : 503, response);
      } catch (error) {
        sendJson(res, 400, {
          status: "offline",
          reason: error instanceof Error ? error.message : "Invalid chat payload."
        });
      }
    });
    return;
  }

  sendJson(res, 404, { error: "not found" });
});

server.listen(config.port, () => {
  console.log(`Ritual Mirror worker listening on :${config.port}`);
});
