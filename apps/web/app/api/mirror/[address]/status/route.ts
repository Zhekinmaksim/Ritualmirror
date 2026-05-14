import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { getMirrorStatus } from "@/lib/server/mirror-status";
import { workerBaseUrl } from "@/lib/worker-server";

export async function GET(_: Request, { params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  if (!isAddress(address)) {
    return NextResponse.json({ error: "Invalid mirror address." }, { status: 400 });
  }

  const relayWorker = workerBaseUrl();
  if (!relayWorker) {
    try {
      const body = await getMirrorStatus(address);
      return NextResponse.json(body, { status: 200 });
    } catch {
      return NextResponse.json(
        {
          status: "offline",
          error: "Server-side status lookup failed."
        },
        { status: 503 }
      );
    }
  }

  try {
    const response = await fetch(`${relayWorker}/mirror/${address}/status`, {
      cache: "no-store"
    });
    const body = await response.json();
    return NextResponse.json(body, { status: response.status });
  } catch {
    return NextResponse.json(
      {
        status: "offline",
        error: "Worker is unreachable. Set RITUAL_WORKER_URL or use built-in server status."
      },
      { status: 503 }
    );
  }
}
