"use client";

import { ritualTestnet } from "@ritual-mirror/ritual";
import { QueryClient } from "@tanstack/react-query";
import { createConfig, http } from "wagmi";

export const queryClient = new QueryClient();

export const wagmiConfig = createConfig({
  chains: [ritualTestnet],
  transports: {
    [ritualTestnet.id]: http(process.env.NEXT_PUBLIC_RITUAL_RPC_URL ?? "https://rpc.ritualfoundation.org")
  },
  ssr: true
});
