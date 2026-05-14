"use client";

import type { Address } from "viem";

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

function ethereum(): EthereumProvider | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as typeof window & { ethereum?: EthereumProvider }).ethereum;
}

export async function sendContractTransaction(to: Address, from: Address, data: `0x${string}`) {
  const provider = ethereum();
  if (!provider) throw new Error("No injected wallet provider found.");
  const hash = await provider.request({
    method: "eth_sendTransaction",
    params: [{ to, from, data }]
  });
  if (typeof hash !== "string" || !hash.startsWith("0x")) throw new Error("Wallet did not return a tx hash.");
  return hash as `0x${string}`;
}
