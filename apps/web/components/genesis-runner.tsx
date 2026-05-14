"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Wallet } from "lucide-react";
import { encodeFunctionData, getAddress, stringToHex } from "viem";
import {
  canonicalJson,
  createGenesisPayload,
  ritualMirrorSovereignConsumerAbi,
  ritualTestnet,
  type MirrorGenesisPayload
} from "@ritual-mirror/ritual";
import { useBrowserWallet } from "@/lib/browser-wallet";
import { appContracts, contractAddressUrl, txUrl } from "@/lib/contracts";
import { patchCreateSession, readCreateSession } from "@/lib/create-session";
import { sendContractTransaction } from "@/lib/wallet-tx";

function restorePayload(): MirrorGenesisPayload | undefined {
  const stored = readCreateSession()?.payload;
  if (!stored) return undefined;
  try {
    return createGenesisPayload(stored.owner, stored.input);
  } catch {
    return undefined;
  }
}

export function GenesisRunner() {
  const { address, chainId, error, isConnected, pending, connect, switchToRitual } = useBrowserWallet();
  const [payload, setPayload] = useState<MirrorGenesisPayload | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  useEffect(() => {
    const session = readCreateSession();
    setPayload(restorePayload());
    setTxHash(session?.genesisTxHash);
  }, []);

  const correctChain = chainId === ritualTestnet.id;
  const ownerMatches = !!address && !!payload && getAddress(address) === getAddress(payload.owner);
  const canSubmit = !!payload && !!address && correctChain && ownerMatches && !!appContracts.sovereignConsumer && !submitting;
  const payloadJson = payload ? canonicalJson(payload) : "";

  const blockedReason = useMemo(() => {
    if (!payload) return "Create flow state is missing. Return to /create and generate the payload again.";
    if (!isConnected) return "Wallet is not connected.";
    if (!correctChain) return "Wallet is not on Ritual Chain.";
    if (!ownerMatches) return "Connected wallet does not match the Genesis payload owner.";
    if (!appContracts.sovereignConsumer) return "NEXT_PUBLIC_SOVEREIGN_CONSUMER_ADDRESS is not set.";
    return undefined;
  }, [correctChain, isConnected, ownerMatches, payload]);

  const submitGenesis = async () => {
    if (!payload || !address || !appContracts.sovereignConsumer) return;
    setSubmitting(true);
    setSubmitError(undefined);
    try {
      const data = encodeFunctionData({
        abi: ritualMirrorSovereignConsumerAbi,
        functionName: "launchGenesis",
        args: [stringToHex(payloadJson)]
      });
      const nextTxHash = await sendContractTransaction(appContracts.sovereignConsumer, address, data);
      setTxHash(nextTxHash);
      patchCreateSession({ genesisTxHash: nextTxHash });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Genesis submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-5">
      <section className="border border-white/12 bg-[#0e1014]/92 p-5">
        <div className="flex items-center justify-between gap-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#d6a35c]">Genesis payload</p>
          {appContracts.sovereignConsumer ? (
            <a
              href={contractAddressUrl(appContracts.sovereignConsumer)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-mono text-xs text-[#d6a35c]"
            >
              Consumer <ExternalLink size={12} />
            </a>
          ) : (
            <span className="font-mono text-xs text-white/38">Consumer missing</span>
          )}
        </div>
        <pre className="mt-4 max-h-[24rem] overflow-auto border border-white/8 bg-black/25 p-4 text-[11px] leading-5 text-white/62">
          {payloadJson || "No create-flow payload is stored."}
        </pre>
      </section>

      <section className="border border-white/12 bg-[#0e1014]/92 p-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#d6a35c]">Wallet guard</p>
        <div className="mt-5 grid gap-3 font-mono text-xs text-white/64">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3">
            <span>Connection</span>
            <span className={isConnected ? "text-[#d6a35c]" : "text-white/38"}>{isConnected ? "Connected" : "Missing"}</span>
          </div>
          <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3">
            <span>Chain</span>
            <span className={correctChain ? "text-[#d6a35c]" : "text-white/38"}>{chainId ?? "-"} / {ritualTestnet.id}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span>Owner match</span>
            <span className={ownerMatches ? "text-[#d6a35c]" : "text-white/38"}>{ownerMatches ? "Yes" : "No"}</span>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          {!isConnected ? (
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 bg-[#e7e9ed] px-4 text-sm font-medium text-[#0b0d10] hover:bg-[#d6a35c] disabled:opacity-50"
              onClick={() => void connect().catch(() => undefined)}
              disabled={pending}
            >
              <Wallet size={16} />
              {pending ? "Pending" : "Connect wallet"}
            </button>
          ) : null}
          {isConnected && !correctChain ? (
            <button
              type="button"
              className="inline-flex h-10 items-center bg-[#e7e9ed] px-4 text-sm font-medium text-[#0b0d10] hover:bg-[#d6a35c] disabled:opacity-50"
              onClick={() => void switchToRitual().catch(() => undefined)}
              disabled={pending}
            >
              {pending ? "Pending" : "Switch to Ritual"}
            </button>
          ) : null}
          <button
            type="button"
            className="inline-flex h-10 items-center border border-white/14 px-4 font-mono text-[11px] uppercase tracking-[0.12em] text-white/72 hover:border-white/34 disabled:opacity-35"
            onClick={() => void submitGenesis()}
            disabled={!canSubmit}
          >
            {submitting ? "Submitting" : "Submit Genesis"}
          </button>
        </div>
        {submitError ? <p className="mt-4 font-mono text-xs leading-5 text-[#d6a35c]">{submitError}</p> : null}
        {error ? <p className="mt-4 font-mono text-xs leading-5 text-[#d6a35c]">{error}</p> : null}
        {blockedReason ? (
          <p className="mt-4 font-mono text-xs leading-6 text-white/48">{blockedReason}</p>
        ) : (
          <p className="mt-4 font-mono text-xs leading-6 text-white/48">
            This transaction hits the local Genesis consumer prototype. Registry state changes only after a separate
            `onSovereignAgentResult` delivery.
          </p>
        )}
        {txHash ? (
          <a
            href={txUrl(txHash)}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-1 font-mono text-xs text-[#d6a35c]"
          >
            Genesis tx {txHash.slice(0, 10)}...{txHash.slice(-8)} <ExternalLink size={12} />
          </a>
        ) : null}
      </section>
    </div>
  );
}
