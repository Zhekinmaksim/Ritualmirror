"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Wallet } from "lucide-react";
import { encodeFunctionData, getAddress } from "viem";
import {
  createPersistentSpawnConfigHash,
  ritualMirrorAgentManagerAbi,
  ritualTestnet,
  type MirrorGenesisPayload
} from "@ritual-mirror/ritual";
import { useBrowserWallet } from "@/lib/browser-wallet";
import { patchCreateSession, readCreateSession } from "@/lib/create-session";
import { appContracts, contractAddressUrl, txUrl } from "@/lib/contracts";
import { sendContractTransaction } from "@/lib/wallet-tx";

function loadPayload() {
  return readCreateSession()?.payload as MirrorGenesisPayload | undefined;
}

const defaultRepo = process.env.NEXT_PUBLIC_HF_REPO_ID ?? "yourname/ritual-mirror-workspace";

export function SpawnRunner() {
  const { address, chainId, error, isConnected, pending, connect, switchToRitual } = useBrowserWallet();
  const [payload, setPayload] = useState<MirrorGenesisPayload | undefined>();
  const [workspaceURI, setWorkspaceURI] = useState("");
  const [daProvider, setDaProvider] = useState<"hf" | "gcs" | "pinata">("hf");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  useEffect(() => {
    const session = readCreateSession();
    const storedPayload = loadPayload();
    setPayload(storedPayload);
    setDaProvider(session?.daProvider ?? "hf");
    setTxHash(session?.spawnTxHash);
    if (storedPayload) {
      setWorkspaceURI(session?.workspaceURI ?? `hf://${defaultRepo}/${storedPayload.owner.toLowerCase()}`);
    }
  }, []);

  const correctChain = chainId === ritualTestnet.id;
  const ownerMatches = !!address && !!payload && getAddress(address) === getAddress(payload.owner);
  const configHash =
    payload && workspaceURI.trim()
      ? createPersistentSpawnConfigHash({
          owner: payload.owner,
          profileHash: payload.profileHash,
          workspaceURI,
          daProvider
        })
      : undefined;

  const blockedReason = useMemo(() => {
    if (!payload) return "Create flow state is missing. Return to /create first.";
    if (!isConnected) return "Wallet is not connected.";
    if (!correctChain) return "Wallet is not on Ritual Chain.";
    if (!ownerMatches) return "Connected wallet does not match the create-flow payload owner.";
    if (!workspaceURI.trim()) return "Workspace URI is required.";
    if (!appContracts.agentManager) return "NEXT_PUBLIC_AGENT_MANAGER_ADDRESS is not set.";
    return undefined;
  }, [correctChain, isConnected, ownerMatches, payload, workspaceURI]);

  const canSubmit = !blockedReason && !submitting && !!address && !!configHash && !!appContracts.agentManager;

  const requestSpawn = async () => {
    if (!address || !configHash || !appContracts.agentManager) return;
    setSubmitting(true);
    setSubmitError(undefined);
    try {
      const data = encodeFunctionData({
        abi: ritualMirrorAgentManagerAbi,
        functionName: "requestSpawn",
        args: [workspaceURI.trim(), configHash]
      });
      const nextTxHash = await sendContractTransaction(appContracts.agentManager, address, data);
      setTxHash(nextTxHash);
      patchCreateSession({ spawnTxHash: nextTxHash, workspaceURI: workspaceURI.trim(), daProvider });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Spawn request failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-5">
      <section className="border border-white/12 bg-[#0e1014]/92 p-5">
        <div className="flex items-center justify-between gap-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#d6a35c]">Persistent config</p>
          {appContracts.agentManager ? (
            <a
              href={contractAddressUrl(appContracts.agentManager)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-mono text-xs text-[#d6a35c]"
            >
              Manager <ExternalLink size={12} />
            </a>
          ) : (
            <span className="font-mono text-xs text-white/38">Manager missing</span>
          )}
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto]">
          <label className="grid gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[#6f747d]">
            Workspace URI
            <input
              className="min-h-12 border border-white/12 bg-black/25 px-4 font-sans text-sm normal-case tracking-normal text-white outline-none focus:border-[#d6a35c]/60"
              value={workspaceURI}
              onChange={(event) => setWorkspaceURI(event.target.value)}
              placeholder="hf://repo/address"
            />
          </label>
          <label className="grid gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[#6f747d]">
            DA provider
            <select
              className="min-h-12 border border-white/12 bg-black/25 px-4 font-sans text-sm normal-case tracking-normal text-white outline-none focus:border-[#d6a35c]/60"
              value={daProvider}
              onChange={(event) => setDaProvider(event.target.value as "hf" | "gcs" | "pinata")}
            >
              <option value="hf">hf</option>
              <option value="gcs">gcs</option>
              <option value="pinata">pinata</option>
            </select>
          </label>
        </div>
        <div className="mt-4 border border-white/8 bg-black/25 p-4 font-mono text-xs leading-6 text-white/62">
          <p>Owner: {payload?.owner ?? "-"}</p>
          <p>Profile hash: {payload?.profileHash ?? "-"}</p>
          <p>Config hash: {configHash ?? "-"}</p>
        </div>
      </section>

      <section className="border border-white/12 bg-[#0e1014]/92 p-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#d6a35c]">Wallet guard</p>
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
            onClick={() => void requestSpawn()}
            disabled={!canSubmit}
          >
            {submitting ? "Submitting" : "Request spawn"}
          </button>
        </div>
        {submitError ? <p className="mt-4 font-mono text-xs leading-5 text-[#d6a35c]">{submitError}</p> : null}
        {error ? <p className="mt-4 font-mono text-xs leading-5 text-[#d6a35c]">{error}</p> : null}
        {blockedReason ? (
          <p className="mt-4 font-mono text-xs leading-6 text-white/48">{blockedReason}</p>
        ) : (
          <p className="mt-4 font-mono text-xs leading-6 text-white/48">
            The current AgentManager contract records the spawn request and workspace URI. Launcher delivery still
            depends on a later factory callback.
          </p>
        )}
        {txHash ? (
          <a
            href={txUrl(txHash)}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-1 font-mono text-xs text-[#d6a35c]"
          >
            Spawn tx {txHash.slice(0, 10)}...{txHash.slice(-8)} <ExternalLink size={12} />
          </a>
        ) : null}
      </section>
    </div>
  );
}
