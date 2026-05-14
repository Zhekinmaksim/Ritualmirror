"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { BrowserWalletProvider } from "@/lib/browser-wallet";
import { queryClient, wagmiConfig } from "@/lib/wagmi";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <BrowserWalletProvider>{children}</BrowserWalletProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
