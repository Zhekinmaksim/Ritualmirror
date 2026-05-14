"use client";

import { formatEther } from "viem";
import { useBlockNumber, useReadContract } from "wagmi";
import { ritualSystemAddresses, ritualWalletAbi } from "@ritual-mirror/ritual";
import { useBrowserWallet } from "@/lib/browser-wallet";

export function RitualWalletStatus() {
  const { address } = useBrowserWallet();
  const { data: blockNumber } = useBlockNumber();
  const balance = useReadContract({
    address: ritualSystemAddresses.ritualWallet,
    abi: ritualWalletAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });
  const lockUntil = useReadContract({
    address: ritualSystemAddresses.ritualWallet,
    abi: ritualWalletAbi,
    functionName: "lockUntil",
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });

  const locked = blockNumber !== undefined && lockUntil.data !== undefined && blockNumber < lockUntil.data;

  return (
    <section className="border border-white/12 bg-[#0e1014]/92 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#d6a35c]">RitualWallet</p>
          <p className="mt-2 text-sm text-[#8a8f98]">Async jobs use locked fee balance from the signing EOA.</p>
        </div>
        <span className={address ? "text-[#d6a35c]" : "text-[#8a8f98]"}>{address ? "Connected" : "No wallet"}</span>
      </div>
      <dl className="mt-5 grid gap-3 border-t border-white/10 pt-5 font-mono text-xs text-white/66 md:grid-cols-3">
        <div>
          <dt className="text-white/42">Balance</dt>
          <dd className="mt-1 font-mono">{balance.data === undefined ? "-" : `${formatEther(balance.data)} RITUAL`}</dd>
        </div>
        <div>
          <dt className="text-white/42">Lock until</dt>
          <dd className="mt-1 font-mono">{lockUntil.data === undefined ? "-" : lockUntil.data.toString()}</dd>
        </div>
        <div>
          <dt className="text-white/42">Status</dt>
          <dd className="mt-1">{locked ? "Locked" : "Not locked"}</dd>
        </div>
      </dl>
    </section>
  );
}
