import { defineChain } from "viem";

export const ritualTestnet = defineChain({
  id: 1979,
  name: "Ritual Chain Testnet",
  nativeCurrency: {
    name: "RITUAL",
    symbol: "RITUAL",
    decimals: 18
  },
  rpcUrls: {
    default: { http: ["https://rpc.ritualfoundation.org"] },
    public: { http: ["https://rpc.ritualfoundation.org"] }
  },
  blockExplorers: {
    default: {
      name: "Ritual Explorer",
      url: "https://explorer.ritualfoundation.org"
    }
  },
  contracts: {
    multicall3: {
      address: "0x5577Ea679673Ec7508E9524100a188E7600202a3"
    }
  },
  testnet: true
});

export const explorerTxUrl = (hash: string) =>
  `${ritualTestnet.blockExplorers.default.url}/tx/${hash}`;

export const explorerAddressUrl = (address: string) =>
  `${ritualTestnet.blockExplorers.default.url}/address/${address}`;
