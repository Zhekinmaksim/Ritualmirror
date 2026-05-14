"use client";

import { Wallet } from "lucide-react";
import { ritualTestnet } from "@ritual-mirror/ritual";
import { useBrowserWallet } from "@/lib/browser-wallet";

export function WalletPanel() {
  const { address, chainId, error, isConnected, pending, connect, disconnect, switchToRitual } = useBrowserWallet();
  const wrongChain = isConnected && chainId !== ritualTestnet.id;

  if (!isConnected) {
    return (
      <button
        type="button"
        className="inline-flex h-9 items-center gap-2 border border-white/14 bg-transparent px-3 font-mono text-[11px] uppercase tracking-[0.12em] text-white/78 transition-colors hover:border-white/32 hover:text-white"
        onClick={() => void connect().catch(() => undefined)}
        disabled={pending}
        title={error}
      >
        <Wallet size={16} />
        {pending ? "Pending" : "Connect"}
      </button>
    );
  }

  if (wrongChain) {
    return (
      <button
        type="button"
        className="inline-flex h-9 items-center border border-[#d6a35c]/60 bg-transparent px-3 font-mono text-[11px] uppercase tracking-[0.12em] text-white transition-colors hover:border-[#d6a35c]"
        onClick={() => void switchToRitual().catch(() => undefined)}
        disabled={pending}
        title={error}
      >
        {pending ? "Pending" : "Switch to Ritual"}
      </button>
    );
  }

  return (
    <button
      type="button"
      className="inline-flex h-9 items-center border border-white/16 bg-transparent px-3 font-mono text-[11px] uppercase tracking-[0.12em] text-mirror-frost transition-colors hover:border-white/32"
      onClick={() => disconnect()}
      title="Disconnect wallet"
    >
      {address?.slice(0, 6)}...{address?.slice(-4)}
    </button>
  );
}
