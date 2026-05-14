import "./_ritual-operator";
import { createPublicClient, http } from "viem";
import {
  defaultSovereignRolling,
  defaultSovereignSchedule,
  mirrorUserSalt,
  persistentFactoryAbi,
  ritualSystemAddresses,
  ritualTestnet,
  sovereignFactoryAbi,
  teeServiceRegistryAbi
} from "@ritual-mirror/ritual";

const owner = process.argv[2] as `0x${string}` | undefined;

if (!owner) {
  console.error("Usage: pnpm ritual:agents:preflight 0xOwner");
  process.exit(1);
}

const client = createPublicClient({
  chain: ritualTestnet,
  transport: http(process.env.RITUAL_RPC_URL ?? "https://rpc.ritualfoundation.org")
});

const mirrorLabel = process.env.RITUAL_MIRROR_LABEL ?? "ritual-mirror";
const userSalt = mirrorUserSalt(owner, mirrorLabel);
const schedule = defaultSovereignSchedule();
schedule.frequency = process.env.SOVEREIGN_SCHEDULER_FREQUENCY ? Number(process.env.SOVEREIGN_SCHEDULER_FREQUENCY) : schedule.frequency;
schedule.schedulerTtl = process.env.SOVEREIGN_SCHEDULER_TTL ? Number(process.env.SOVEREIGN_SCHEDULER_TTL) : schedule.schedulerTtl;
const rolling = defaultSovereignRolling();

async function main() {
  const [sovereignCode, persistentCode, services, sovereignPrediction, persistentPrediction, dkms] = await Promise.all([
    client.getCode({ address: ritualSystemAddresses.sovereignAgentFactory }),
    client.getCode({ address: ritualSystemAddresses.persistentAgentFactory }),
    client.readContract({
      address: ritualSystemAddresses.teeServiceRegistry,
      abi: teeServiceRegistryAbi,
      functionName: "getServicesByCapability",
      args: [0, true]
    }),
    client.readContract({
      address: ritualSystemAddresses.sovereignAgentFactory,
      abi: sovereignFactoryAbi,
      functionName: "predictHarness",
      args: [owner, userSalt]
    }),
    client.readContract({
      address: ritualSystemAddresses.persistentAgentFactory,
      abi: persistentFactoryAbi,
      functionName: "predictLauncher",
      args: [owner, userSalt]
    }),
    client.readContract({
      address: ritualSystemAddresses.sovereignAgentFactory,
      abi: sovereignFactoryAbi,
      functionName: "getDkmsDerivation",
      args: [owner, userSalt]
    })
  ]);

  console.log(JSON.stringify({
    owner,
    mirrorLabel,
    userSalt,
    factories: {
      sovereign: {
        address: ritualSystemAddresses.sovereignAgentFactory,
        codePresent: !!sovereignCode && sovereignCode !== "0x"
      },
      persistent: {
        address: ritualSystemAddresses.persistentAgentFactory,
        codePresent: !!persistentCode && persistentCode !== "0x"
      }
    },
    executorDiscovery: {
      capability: "HTTP_CALL",
      count: services.length,
      firstExecutor: services[0]?.node.teeAddress ?? null
    },
    predictions: {
      sovereignHarness: sovereignPrediction[0],
      sovereignChildSalt: sovereignPrediction[1],
      persistentLauncher: persistentPrediction[0],
      persistentChildSalt: persistentPrediction[1],
      dkmsOwner: dkms[0],
      dkmsKeyIndex: dkms[1].toString(),
      dkmsKeyFormat: dkms[2]
    },
    schedule,
    rolling,
    checks: [
      "Set SovereignAgentParams.deliveryTarget to predicted sovereignHarness.",
      "Use the first valid executor only after checking model/provider/secrets compatibility.",
      "Keep frequency * windowNumCalls <= 10000.",
      "Fund RitualWallet for the signing EOA before submit."
    ]
  }, (_, value) => (typeof value === "bigint" ? value.toString() : value), 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
