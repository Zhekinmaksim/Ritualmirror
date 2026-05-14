import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { workerBaseUrl } from "@/lib/worker-server";

export async function POST(request: Request, { params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  if (!isAddress(address)) {
    return NextResponse.json({ error: "Invalid mirror address." }, { status: 400 });
  }

  const body = await request.text();

  try {
    const response = await fetch(`${workerBaseUrl()}/mirror/${address}/chat`, {
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
        error: "Worker is unreachable. Set RITUAL_WORKER_URL or start apps/worker."
      },
      { status: 503 }
    );
  }
}
