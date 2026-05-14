"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ritualTestnet } from "@ritual-mirror/ritual";
import { getAddress, isAddress } from "viem";

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
};

type BrowserWalletContextValue = {
  address?: `0x${string}`;
  chainId?: number;
  error?: string;
  pending: boolean;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToRitual: () => Promise<void>;
};

const BrowserWalletContext = createContext<BrowserWalletContextValue | undefined>(undefined);

function ethereum(): EthereumProvider | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as typeof window & { ethereum?: EthereumProvider }).ethereum;
}

function parseChainId(value: unknown): number | undefined {
  if (typeof value === "string" && /^0x[0-9a-fA-F]+$/.test(value)) return Number.parseInt(value, 16);
  if (typeof value === "number") return value;
  return undefined;
}

function normalizeAddress(value: unknown): `0x${string}` | undefined {
  if (typeof value !== "string" || !isAddress(value)) return undefined;
  return getAddress(value);
}

function providerErrorCode(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "number" ? code : undefined;
  }
  return undefined;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Wallet request failed.";
}

export function BrowserWalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<`0x${string}` | undefined>();
  const [chainId, setChainId] = useState<number | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  const refresh = useCallback(async () => {
    const provider = ethereum();
    if (!provider) return;
    try {
      const [accounts, chain] = await Promise.all([
        provider.request({ method: "eth_accounts" }) as Promise<unknown[]>,
        provider.request({ method: "eth_chainId" })
      ]);
      setAddress(normalizeAddress(accounts[0]));
      setChainId(parseChainId(chain));
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  }, []);

  useEffect(() => {
    void refresh();
    const provider = ethereum();
    if (!provider?.on) return;
    const onAccounts = (accounts: unknown) => {
      const next = Array.isArray(accounts) ? accounts[0] : undefined;
      setAddress(normalizeAddress(next));
    };
    const onChain = (chain: unknown) => setChainId(parseChainId(chain));
    provider.on("accountsChanged", onAccounts);
    provider.on("chainChanged", onChain);
    return () => {
      provider.removeListener?.("accountsChanged", onAccounts);
      provider.removeListener?.("chainChanged", onChain);
    };
  }, [refresh]);

  const connect = useCallback(async () => {
    const provider = ethereum();
    if (!provider) throw new Error("No injected wallet provider found.");
    setPending(true);
    setError(undefined);
    try {
      const accounts = (await provider.request({ method: "eth_requestAccounts" })) as unknown[];
      const nextAddress = normalizeAddress(accounts[0]);
      if (!nextAddress) throw new Error("Wallet returned an invalid account address.");
      const chain = await provider.request({ method: "eth_chainId" });
      setAddress(nextAddress);
      setChainId(parseChainId(chain));
    } catch (requestError) {
      setError(errorMessage(requestError));
      throw requestError;
    } finally {
      setPending(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(undefined);
    setError(undefined);
  }, []);

  const switchToRitual = useCallback(async () => {
    const provider = ethereum();
    if (!provider) throw new Error("No injected wallet provider found.");
    const hexChainId = `0x${ritualTestnet.id.toString(16)}`;
    setPending(true);
    setError(undefined);
    try {
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexChainId }] });
    } catch (switchError) {
      if (providerErrorCode(switchError) !== 4902) {
        setError(errorMessage(switchError));
        throw switchError;
      }
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: hexChainId,
            chainName: ritualTestnet.name,
            nativeCurrency: ritualTestnet.nativeCurrency,
            rpcUrls: ritualTestnet.rpcUrls.default.http,
            blockExplorerUrls: [ritualTestnet.blockExplorers.default.url]
          }
        ]
      });
    } finally {
      const chain = await provider.request({ method: "eth_chainId" });
      setChainId(parseChainId(chain));
      setPending(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      address,
      chainId,
      error,
      pending,
      isConnected: !!address,
      connect,
      disconnect,
      switchToRitual
    }),
    [address, chainId, connect, disconnect, error, pending, switchToRitual]
  );

  return <BrowserWalletContext.Provider value={value}>{children}</BrowserWalletContext.Provider>;
}

export function useBrowserWallet() {
  const context = useContext(BrowserWalletContext);
  if (!context) throw new Error("useBrowserWallet must be used inside BrowserWalletProvider");
  return context;
}
