"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Copy, ExternalLink, Wallet } from "lucide-react";
import {
  builderTypes,
  canonicalJson,
  createGenesisPayload,
  explorerAddressUrl,
  mirrorGenesisInputSchema,
  ritualMirrorNftAbi,
  ritualMirrorRegistryAbi,
  ritualTestnet,
  type MirrorGenesisInput
} from "@ritual-mirror/ritual";
import { encodeFunctionData, getAddress, isAddress } from "viem";
import { useReadContract } from "wagmi";
import { useBrowserWallet } from "@/lib/browser-wallet";
import { patchCreateSession } from "@/lib/create-session";
import { appContracts, contractAddressUrl, contractsReady, txUrl } from "@/lib/contracts";
import { sendContractTransaction } from "@/lib/wallet-tx";

type FormState = {
  wallet: string;
  nickname: string;
  bio: string;
  xUrl: string;
  githubUrl: string;
  websiteUrl: string;
  projectIdea: string;
  builderType: MirrorGenesisInput["builderType"];
  responseStyle: string;
};

const initialForm: FormState = {
  wallet: "",
  nickname: "zmaxx",
  bio: "",
  xUrl: "",
  githubUrl: "",
  websiteUrl: "",
  projectIdea: "",
  builderType: "Protocol Operator",
  responseStyle: "terse, technical, cautious"
};

const metadataBaseUrl = process.env.NEXT_PUBLIC_METADATA_BASE_URL ?? "https://ritualmirror.xyz";

const textFields = [
  ["nickname", "Nickname", "zmaxx"],
  ["bio", "Bio", "Short public builder note"],
  ["xUrl", "X profile URL", "https://x.com/..."],
  ["githubUrl", "GitHub URL", "https://github.com/..."],
  ["websiteUrl", "Website URL", "https://..."],
  ["projectIdea", "Project context", "Repo, protocol role, or current scope"],
  ["responseStyle", "Response style", "terse, technical, cautious"]
] as const;

function errorText(error: unknown) {
  if (!error || typeof error !== "object" || !("issues" in error)) return undefined;
  const issues = (error as { issues?: Array<{ path: Array<string | number>; message: string }> }).issues ?? [];
  return issues.slice(0, 3).map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(" / ");
}

function shortHash(hash: string) {
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

export function CreateFlow() {
  const { address, chainId, error, isConnected, pending, connect, switchToRitual } = useBrowserWallet();
  const [form, setForm] = useState<FormState>(initialForm);
  const [copied, setCopied] = useState(false);
  const [metadataURI, setMetadataURI] = useState("");
  const [contractPending, setContractPending] = useState<"create" | "update" | "mint" | undefined>();
  const [contractError, setContractError] = useState<string | undefined>();
  const [txHashes, setTxHashes] = useState<Array<{ label: string; hash: `0x${string}` }>>([]);

  useEffect(() => {
    if (!address) return;
    setForm((current) => ({ ...current, wallet: address }));
  }, [address]);

  const parsed = useMemo(() => {
    const wallet = isAddress(form.wallet) ? getAddress(form.wallet) : form.wallet;
    return mirrorGenesisInputSchema.safeParse({ ...form, wallet });
  }, [form]);

  const payload = useMemo(() => {
    if (!parsed.success) return undefined;
    return createGenesisPayload(parsed.data.wallet, parsed.data);
  }, [parsed]);

  const payloadJson = payload ? canonicalJson(payload) : "";
  const correctChain = chainId === ritualTestnet.id;
  const walletMatches = !!address && !!payload && getAddress(payload.owner) === getAddress(address);
  const ready = !!payload && isConnected && correctChain && walletMatches;
  const effectiveMetadataURI = payload
    ? metadataURI.trim() || `${metadataBaseUrl.replace(/\/$/, "")}/api/metadata/${payload.owner}`
    : "";

  useEffect(() => {
    if (!payload) {
      patchCreateSession({
        payload: undefined,
        payloadJson: undefined
      });
      return;
    }
    patchCreateSession({
      payload,
      payloadJson,
      metadataURI: effectiveMetadataURI
    });
  }, [effectiveMetadataURI, payload, payloadJson]);

  const hasMirror = useReadContract({
    address: appContracts.registry,
    abi: ritualMirrorRegistryAbi,
    functionName: "hasMirror",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!appContracts.registry }
  });

  const mirrorToken = useReadContract({
    address: appContracts.nft,
    abi: ritualMirrorNftAbi,
    functionName: "mirrorOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!appContracts.nft }
  });

  const registryRecordExists = hasMirror.data === true;
  const mintedTokenId = mirrorToken.data && mirrorToken.data > 0n ? mirrorToken.data : undefined;

  const update = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setCopied(false);
  };

  const copyPayload = async () => {
    if (!payloadJson) return;
    await navigator.clipboard.writeText(payloadJson);
    setCopied(true);
  };

  const recordTx = async (label: string, hash: `0x${string}`) => {
    setTxHashes((current) => [{ label, hash }, ...current].slice(0, 5));
    await Promise.all([hasMirror.refetch(), mirrorToken.refetch()]);
  };

  const runContractAction = async (action: "create" | "update" | "mint") => {
    if (!ready || !payload || !address) return;
    setContractPending(action);
    setContractError(undefined);
    try {
      if (action === "create" || action === "update") {
        if (!appContracts.registry) throw new Error("NEXT_PUBLIC_REGISTRY_ADDRESS is not set.");
        const data = encodeFunctionData({
          abi: ritualMirrorRegistryAbi,
          functionName: action === "create" ? "createMirror" : "updateMirror",
          args: [payload.profileHash, effectiveMetadataURI]
        });
        const hash = await sendContractTransaction(appContracts.registry, address, data);
        await recordTx(action === "create" ? "Registry create" : "Registry update", hash);
      }

      if (action === "mint") {
        if (!appContracts.nft) throw new Error("NEXT_PUBLIC_NFT_ADDRESS is not set.");
        const data = encodeFunctionData({
          abi: ritualMirrorNftAbi,
          functionName: "mintMirror",
          args: [address, effectiveMetadataURI]
        });
        const hash = await sendContractTransaction(appContracts.nft, address, data);
        await recordTx("NFT mint", hash);
      }
    } catch (actionError) {
      setContractError(actionError instanceof Error ? actionError.message : "Contract transaction failed.");
    } finally {
      setContractPending(undefined);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr]">
      <form className="grid gap-5 border border-white/12 bg-[#0e1014]/92 p-5 md:p-7">
        <label className="grid gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[#6f747d]">
          Wallet address
          <input
            className="min-h-12 border border-white/12 bg-black/25 px-4 font-sans text-sm normal-case tracking-normal text-white outline-none focus:border-[#d6a35c]/60 disabled:text-white/46"
            placeholder={isConnected ? "Connected wallet" : "Connect wallet to fill"}
            value={form.wallet}
            disabled={isConnected}
            onChange={(event) => update("wallet", event.target.value)}
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          {textFields.map(([key, label, placeholder]) => (
            <label key={key} className="grid gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[#6f747d]">
              {label}
              <input
                className="min-h-12 border border-white/12 bg-black/25 px-4 font-sans text-sm normal-case tracking-normal text-white outline-none focus:border-[#d6a35c]/60"
                placeholder={placeholder}
                value={form[key]}
                onChange={(event) => update(key, event.target.value)}
              />
            </label>
          ))}
        </div>

        <label className="grid gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[#6f747d]">
          Builder type
          <select
            className="min-h-12 border border-white/12 bg-black/25 px-4 font-sans text-sm normal-case tracking-normal text-white outline-none focus:border-[#d6a35c]/60"
            value={form.builderType}
            onChange={(event) => update("builderType", event.target.value)}
          >
            {builderTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>

        {!parsed.success ? (
          <div className="border border-[#d6a35c]/30 bg-[#d6a35c]/5 p-4 font-mono text-xs leading-6 text-[#d0d3d8]">
            {errorText(parsed.error) ?? "Complete the required fields to create the profile hash."}
          </div>
        ) : null}
      </form>

      <aside className="grid gap-5 self-start">
        <section className="border border-white/12 bg-[#0e1014]/92 p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#d6a35c]">Wallet guard</p>
          <div className="mt-5 grid gap-3 font-mono text-xs text-white/64">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3">
              <span>Connection</span>
              <span className={isConnected ? "text-[#d6a35c]" : "text-white/42"}>{isConnected ? "Connected" : "Missing"}</span>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3">
              <span>Chain</span>
              <span className={correctChain ? "text-[#d6a35c]" : "text-white/42"}>{chainId ?? "-"} / {ritualTestnet.id}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Owner match</span>
              <span className={walletMatches ? "text-[#d6a35c]" : "text-white/42"}>{walletMatches ? "Yes" : "No"}</span>
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
          </div>

          {error ? <p className="mt-4 font-mono text-xs leading-5 text-[#d6a35c]">{error}</p> : null}
        </section>

        <section className="border border-white/12 bg-[#0e1014]/92 p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#d6a35c]">Profile hash</p>
          <p className="mt-4 break-all font-mono text-sm text-[#e7e9ed]">{payload?.profileHash ?? "Complete input first"}</p>
          {payload?.profileHash ? <p className="mt-2 font-mono text-xs text-white/42">{shortHash(payload.profileHash)}</p> : null}
          {payload ? (
            <a
              href={explorerAddressUrl(payload.owner)}
              className="mt-4 inline-flex font-mono text-xs uppercase tracking-[0.12em] text-[#8a8f98] hover:text-[#e7e9ed]"
              target="_blank"
              rel="noreferrer"
            >
              Owner on explorer
            </a>
          ) : null}
        </section>

        <section className="border border-white/12 bg-[#0e1014]/92 p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#d6a35c]">Contracts</p>
          <div className="mt-5 grid gap-3 font-mono text-xs text-white/64">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3">
              <span>Registry</span>
              {appContracts.registry ? (
                <a className="inline-flex items-center gap-1 text-[#d6a35c]" href={contractAddressUrl(appContracts.registry)} target="_blank" rel="noreferrer">
                  Set <ExternalLink size={12} />
                </a>
              ) : (
                <span className="text-white/42">Missing env</span>
              )}
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3">
              <span>NFT</span>
              {appContracts.nft ? (
                <a className="inline-flex items-center gap-1 text-[#d6a35c]" href={contractAddressUrl(appContracts.nft)} target="_blank" rel="noreferrer">
                  Set <ExternalLink size={12} />
                </a>
              ) : (
                <span className="text-white/42">Missing env</span>
              )}
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3">
              <span>Registry record</span>
              <span className={registryRecordExists ? "text-[#d6a35c]" : "text-white/42"}>
                {registryRecordExists ? "Created" : "Not found"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>NFT token</span>
              <span className={mintedTokenId ? "text-[#d6a35c]" : "text-white/42"}>
                {mintedTokenId ? mintedTokenId.toString() : "Not minted"}
              </span>
            </div>
          </div>

          <label className="mt-5 grid gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[#6f747d]">
            Metadata URI
            <input
              className="min-h-12 border border-white/12 bg-black/25 px-4 font-sans text-sm normal-case tracking-normal text-white outline-none focus:border-[#d6a35c]/60"
              placeholder={effectiveMetadataURI || "https://ritualmirror.xyz/api/metadata/0x..."}
              value={metadataURI}
              onChange={(event) => setMetadataURI(event.target.value)}
            />
          </label>
          {effectiveMetadataURI ? <p className="mt-2 break-all font-mono text-xs text-white/42">{effectiveMetadataURI}</p> : null}

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              className="h-10 border border-white/14 px-3 font-mono text-[11px] uppercase tracking-[0.12em] text-white/72 hover:border-white/34 disabled:opacity-35"
              disabled={!ready || !contractsReady || registryRecordExists || !!contractPending}
              onClick={() => void runContractAction("create")}
            >
              {contractPending === "create" ? "Pending" : "Create"}
            </button>
            <button
              type="button"
              className="h-10 border border-white/14 px-3 font-mono text-[11px] uppercase tracking-[0.12em] text-white/72 hover:border-white/34 disabled:opacity-35"
              disabled={!ready || !contractsReady || !registryRecordExists || !!contractPending}
              onClick={() => void runContractAction("update")}
            >
              {contractPending === "update" ? "Pending" : "Update"}
            </button>
            <button
              type="button"
              className="h-10 bg-[#e7e9ed] px-3 font-mono text-[11px] uppercase tracking-[0.12em] text-[#0b0d10] hover:bg-[#d6a35c] disabled:bg-transparent disabled:text-white/32 disabled:ring-1 disabled:ring-white/12"
              disabled={!ready || !contractsReady || !registryRecordExists || !!mintedTokenId || !!contractPending}
              onClick={() => void runContractAction("mint")}
            >
              {contractPending === "mint" ? "Pending" : "Mint"}
            </button>
          </div>

          {contractError ? <p className="mt-4 font-mono text-xs leading-5 text-[#d6a35c]">{contractError}</p> : null}
          {!contractsReady ? (
            <p className="mt-4 font-mono text-xs leading-5 text-white/46">
              Set `NEXT_PUBLIC_REGISTRY_ADDRESS` and `NEXT_PUBLIC_NFT_ADDRESS` after deployment.
            </p>
          ) : null}
          {txHashes.length > 0 ? (
            <div className="mt-5 grid gap-2 border-t border-white/10 pt-4 font-mono text-xs">
              {txHashes.map((tx) => (
                <a key={tx.hash} href={txUrl(tx.hash)} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 text-white/62 hover:text-[#e7e9ed]">
                  <span>{tx.label}</span>
                  <span className="inline-flex items-center gap-1 text-[#d6a35c]">
                    {shortHash(tx.hash)} <ExternalLink size={12} />
                  </span>
                </a>
              ))}
            </div>
          ) : null}
        </section>

        <section className="border border-white/12 bg-[#0e1014]/92 p-5">
          <div className="flex items-center justify-between gap-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#d6a35c]">Genesis payload</p>
            <button
              type="button"
              className="inline-flex h-9 items-center gap-2 border border-white/14 px-3 font-mono text-[11px] uppercase tracking-[0.12em] text-white/72 hover:border-white/34 disabled:opacity-40"
              onClick={() => void copyPayload()}
              disabled={!payloadJson}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="mt-4 max-h-[24rem] overflow-auto border border-white/8 bg-black/25 p-4 text-[11px] leading-5 text-white/62">
            {payloadJson || "No payload"}
          </pre>
        </section>

        <div className="border border-white/12 bg-black/20 p-4 font-mono text-xs leading-6 text-white/62">
          {ready ? (
            <span className="text-[#d6a35c]">Ready for Genesis submission.</span>
          ) : (
            "Genesis submission is blocked until wallet, chain, owner, and input checks pass."
          )}
        </div>

        <a
          className={[
            "inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium",
            ready ? "bg-[#e7e9ed] text-[#0b0d10] hover:bg-[#d6a35c]" : "pointer-events-none border border-white/12 text-white/32"
          ].join(" ")}
          href="/create/genesis"
          aria-disabled={!ready}
        >
          Continue to Genesis <ArrowRight size={16} />
        </a>
      </aside>
    </div>
  );
}
