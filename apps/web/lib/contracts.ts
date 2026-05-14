import { getAddress, isAddress, zeroAddress, type Address } from "viem";
import { explorerAddressUrl, explorerTxUrl } from "@ritual-mirror/ritual";

function publicAddress(value: string | undefined): Address | undefined {
  if (!value || !isAddress(value) || getAddress(value) === zeroAddress) return undefined;
  return getAddress(value);
}

export const appContracts = {
  registry: publicAddress(process.env.NEXT_PUBLIC_REGISTRY_ADDRESS),
  nft: publicAddress(process.env.NEXT_PUBLIC_NFT_ADDRESS),
  sovereignConsumer: publicAddress(process.env.NEXT_PUBLIC_SOVEREIGN_CONSUMER_ADDRESS),
  agentManager: publicAddress(process.env.NEXT_PUBLIC_AGENT_MANAGER_ADDRESS)
} as const;

export const contractAddressUrl = (address?: Address) => (address ? explorerAddressUrl(address) : undefined);
export const txUrl = (hash?: `0x${string}`) => (hash ? explorerTxUrl(hash) : undefined);

export const contractsReady = Boolean(appContracts.registry && appContracts.nft);
