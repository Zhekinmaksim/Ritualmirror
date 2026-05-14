"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { contractAddressUrl } from "@/lib/contracts";
import type { MirrorStatusResponse } from "@ritual-mirror/ritual";

function labelForPhase(phase: MirrorStatusResponse["phase"]) {
  switch (phase) {
    case "unregistered":
      return "Unregistered Record";
    case "registered":
      return "Registry record";
    case "genesis-linked":
      return "Genesis linked";
    case "spawn-requested":
      return "Spawn requested";
    case "launcher-stored":
      return "Launcher stored";
    case "minted":
      return "Minted record";
  }
}

export function MirrorStatusPanel({ address }: { address: string }) {
  const [status, setStatus] = useState<MirrorStatusResponse | undefined>();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(`/api/mirror/${address}/status`, { cache: "no-store" });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Status request failed.");
        if (!cancelled) {
          setStatus(body as MirrorStatusResponse);
          setError(undefined);
        }
      } catch (requestError) {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : "Status request failed.");
      }
    };

    void load();
    const interval = window.setInterval(load, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [address]);

  return (
    <aside className="border border-white/12 bg-[#0e1014]/92 p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#d6a35c]">Owner</p>
      <p className="mt-3 break-all font-mono text-sm text-mirror-frost">{address}</p>

      {error ? (
        <p className="mt-6 font-mono text-xs leading-6 text-[#d6a35c]">{error}</p>
      ) : status ? (
        <>
          <div className="mt-6 grid gap-3 border-t border-white/10 pt-5 font-mono text-xs text-white/62">
            <p>Phase: {labelForPhase(status.phase)}</p>
            <p>Genesis job: {status.mirror?.genesisJobId && status.mirror.genesisJobId !== "0x0000000000000000000000000000000000000000000000000000000000000000" ? "linked" : "not delivered"}</p>
            <p>Persistent launcher: {status.agent.launcher ?? "not stored"}</p>
            <p>NFT token: {status.nft.minted ? status.nft.tokenId : "not minted"}</p>
          </div>

          {status.diagnostics.length > 0 ? (
            <div className="mt-5 border-t border-white/10 pt-4 font-mono text-xs leading-6 text-white/48">
              {status.diagnostics.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={`/mirror/${address}/chat`} className="inline-flex bg-[#e7e9ed] px-5 py-3 text-sm font-medium text-[#0b0d10] hover:bg-[#d6a35c]">
              Open console
            </Link>
            {status.contracts.registry ? (
              <a
                href={contractAddressUrl(status.contracts.registry)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 border border-white/14 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-white/72 hover:border-white/34"
              >
                Registry <ExternalLink size={12} />
              </a>
            ) : null}
          </div>
        </>
      ) : (
        <p className="mt-6 font-mono text-xs leading-6 text-white/48">Polling worker status...</p>
      )}
    </aside>
  );
}
