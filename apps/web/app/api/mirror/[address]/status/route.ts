import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { workerBaseUrl } from "@/lib/worker-server";

export async function GET(_: Request, { params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  if (!isAddress(address)) {
    return NextResponse.json({ error: "Invalid mirror address." }, { status: 400 });
  }

  try {
    const response = await fetch(`${workerBaseUrl()}/mirror/${address}/status`, {
      cache: "no-store"
    });
    const body = await response.json();
    return NextResponse.json(body, { status: response.status });
  } catch {
    return NextResponse.json(
      {
        status: "offline",
        error: "Worker is unreachable. Set RITUAL_WORKER_URL or start apps/worker."
      },
      { status: 503 }
    );
  }
}
