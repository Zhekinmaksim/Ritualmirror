import { createServer } from "node:http";
import { loadConfig } from "./config";
import { askPersistentMirror } from "./agentRelay";
import { checkHeartbeat } from "./heartbeatMonitor";
import { getMirrorStatus } from "./mirrorStatus";

const config = loadConfig();

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "GET" && url.pathname === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, chainId: 1979, rpcUrl: config.rpcUrl }));
    return;
  }

  if (req.method === "GET" && url.pathname.startsWith("/mirror/") && url.pathname.endsWith("/status")) {
    const [, , address] = url.pathname.split("/");
    try {
      const status = await getMirrorStatus(address);
      const heartbeat = await checkHeartbeat(status.agent.launcher, status.agent.online);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ...status, heartbeat }));
    } catch (error) {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          status: "error",
          error: error instanceof Error ? error.message : "Status lookup failed."
        })
      );
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
      const parsed = body ? JSON.parse(body) : {};
      const response = await askPersistentMirror({ address, question: String(parsed.question ?? "") });
      res.writeHead(response.status === "online" ? 200 : 503, { "content-type": "application/json" });
      res.end(JSON.stringify(response));
    });
    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "not found" }));
});

server.listen(config.port, () => {
  console.log(`Ritual Mirror worker listening on :${config.port}`);
});
