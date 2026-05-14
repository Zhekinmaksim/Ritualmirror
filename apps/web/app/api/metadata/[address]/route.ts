import { NextResponse } from "next/server";
import { createPublicClient, getAddress, http, isAddress } from "viem";
import { ritualMirrorRegistryAbi, ritualTestnet } from "@ritual-mirror/ritual";

function registryAddress() {
  const value = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS ?? process.env.REGISTRY_ADDRESS;
  if (!value || !isAddress(value)) return undefined;
  return getAddress(value);
}

function imageDataUri(params: {
  owner: string;
  profileHash: string;
  version: string;
  active: boolean;
}) {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
    <defs>
      <radialGradient id="bg" cx="50%" cy="44%" r="62%">
        <stop offset="0%" stop-color="#2e271b" />
        <stop offset="45%" stop-color="#171412" />
        <stop offset="100%" stop-color="#080909" />
      </radialGradient>
    </defs>
    <rect width="1200" height="1200" fill="url(#bg)" />
    <circle cx="760" cy="420" r="258" fill="none" stroke="rgba(244,241,235,0.72)" stroke-width="12" />
    <circle cx="760" cy="420" r="170" fill="none" stroke="rgba(190,151,84,0.7)" stroke-width="5" />
    <circle cx="760" cy="420" r="28" fill="#d5b06a" />
    <line x1="760" y1="220" x2="760" y2="620" stroke="rgba(190,151,84,0.58)" stroke-width="3" />
    <text x="84" y="132" fill="#f4f1eb" font-size="56" font-family="Inter, Arial, sans-serif" font-weight="700">Ritual Mirror</text>
    <text x="84" y="196" fill="#b28b51" font-size="24" font-family="IBM Plex Mono, monospace" letter-spacing="3">CHAIN 1979</text>
    <text x="84" y="816" fill="#f4f1eb" font-size="88" font-family="Inter, Arial, sans-serif" font-weight="700">Registry record</text>
    <text x="84" y="882" fill="#a1a4ab" font-size="28" font-family="Inter, Arial, sans-serif">Owner ${params.owner}</text>
    <text x="84" y="930" fill="#a1a4ab" font-size="28" font-family="Inter, Arial, sans-serif">Profile ${params.profileHash}</text>
    <text x="84" y="978" fill="#a1a4ab" font-size="28" font-family="Inter, Arial, sans-serif">Version ${params.version}</text>
    <text x="84" y="1026" fill="${params.active ? "#d5b06a" : "#7b7f87"}" font-size="28" font-family="Inter, Arial, sans-serif">${params.active ? "Active" : "Inactive"}</text>
  </svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export async function GET(_: Request, context: { params: Promise<{ address: string }> }) {
  const { address } = await context.params;

  if (!isAddress(address)) {
    return NextResponse.json({ error: "Invalid address." }, { status: 400 });
  }

  const registry = registryAddress();
  if (!registry) {
    return NextResponse.json({ error: "Registry address is not configured." }, { status: 503 });
  }

  const owner = getAddress(address);
  const client = createPublicClient({
    chain: ritualTestnet,
    transport: http(process.env.NEXT_PUBLIC_RITUAL_RPC_URL ?? "https://rpc.ritualfoundation.org")
  });

  const mirror = await client.readContract({
    address: registry,
    abi: ritualMirrorRegistryAbi,
    functionName: "getMirror",
    args: [owner]
  });

  if (mirror.createdAt === 0n) {
    return NextResponse.json({ error: "Mirror record not found." }, { status: 404 });
  }

  const profileHash = mirror.profileHash;
  const description = `Ritual Mirror registry record for ${owner}. Profile hash ${profileHash}. Version ${mirror.version}.`;

  return NextResponse.json({
    name: `Ritual Mirror ${owner.slice(0, 6)}...${owner.slice(-4)}`,
    description,
    image: imageDataUri({
      owner: `${owner.slice(0, 8)}...${owner.slice(-6)}`,
      profileHash: `${profileHash.slice(0, 10)}...${profileHash.slice(-8)}`,
      version: mirror.version.toString(),
      active: mirror.active
    }),
    external_url: `${process.env.NEXT_PUBLIC_METADATA_BASE_URL ?? "https://ritualmirror.xyz"}/mirror/${owner}`,
    attributes: [
      { trait_type: "Owner", value: owner },
      { trait_type: "Profile Hash", value: profileHash },
      { trait_type: "Version", value: mirror.version.toString() },
      { trait_type: "Genesis Job", value: mirror.genesisJobId },
      { trait_type: "Persistent Launcher", value: mirror.persistentAgentLauncher },
      { trait_type: "Active", value: mirror.active ? "true" : "false" }
    ]
  });
}
