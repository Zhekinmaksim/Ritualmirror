import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { askPersistentMirror } from "@/lib/server/agent-relay";
import { workerBaseUrl } from "@/lib/worker-server";

export async function POST(request: Request, { params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  if (!isAddress(address)) {
    return NextResponse.json({ error: "Invalid mirror address." }, { status: 400 });
  }

  const body = await request.text();
  const relayWorker = workerBaseUrl();

  if (!relayWorker) {
    try {
      const parsed = body ? JSON.parse(body) : {};
      const response = await askPersistentMirror({ address, question: String(parsed.question ?? "") });
      return NextResponse.json(response, { status: response.status === "online" ? 200 : 503 });
    } catch {
      return NextResponse.json(
        {
          address,
          status: "offline",
          error: "Server-side chat relay failed."
        },
        { status: 503 }
      );
    }
  }

  try {
    const response = await fetch(`${relayWorker}/mirror/${address}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body
    });
    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json(
      {
        address,
        status: "offline",
        error: "Worker is unreachable. Set RITUAL_WORKER_URL or use built-in server relay."
      },
      { status: 503 }
    );
  }
}
