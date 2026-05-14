import "./_ritual-operator";
import { createPublicClient, http } from "viem";
import { ritualSystemAddresses, ritualTestnet } from "@ritual-mirror/ritual";

const client = createPublicClient({
  chain: ritualTestnet,
  transport: http(process.env.RITUAL_RPC_URL ?? "https://rpc.ritualfoundation.org")
});

const targets = {
  sovereignAgentFactory: ritualSystemAddresses.sovereignAgentFactory,
  persistentAgentFactory: ritualSystemAddresses.persistentAgentFactory
} as const;

async function main() {
  for (const [name, address] of Object.entries(targets)) {
    const code = await client.getCode({ address: address as `0x${string}` });
    console.log(`${name} ${address} code=${code && code !== "0x" ? "present" : "missing"}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
