# Ritual Mirror

Create your living on-chain AI mirror on Ritual Chain.

Ritual Mirror turns a wallet, bio, and public builder identity into a persistent on-chain AI persona. A Sovereign Agent creates the Mirror Genesis, a Persistent Agent keeps the Mirror alive through DA-backed memory, and a Mirror NFT represents the identity.

This is an independent community experiment for Ritual Chain testnet. It is not affiliated with or endorsed by Ritual Foundation.

## Stack

- Next.js App Router, TypeScript, Tailwind, wagmi/viem
- Foundry, Solidity `^0.8.28`
- Ritual Chain testnet, chain ID `1979`
- Worker relay for persistent agent status and chat
- DA provider target: HuggingFace first

## Development

```bash
pnpm install
pnpm build
pnpm contracts:test
pnpm dev
```

`pnpm install` needs network access. Copy `.env.example` to `.env.local` or service-specific env files and fill contract addresses after deployment.

## Ritual Deploy

```bash
cp .env.example .env
# edit PRIVATE_KEY; keep it out of git
pnpm contracts:build
pnpm contracts:test
pnpm contracts:deploy:ritual
```

After deployment, copy the emitted contract addresses into `apps/web/.env.local`:

```env
NEXT_PUBLIC_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_NFT_ADDRESS=0x...
NEXT_PUBLIC_SOVEREIGN_CONSUMER_ADDRESS=0x...
NEXT_PUBLIC_AGENT_MANAGER_ADDRESS=0x...
```

Restart the web app after changing env vars. The create flow links configured contract addresses and transaction hashes to the Ritual explorer.

## Production Deploy

The codebase can be pushed and deployed independently from the live Ritual callback state.

Current practical split:

- code release / preview deploy: ready when `pnpm build` is green
- Ritual-native end-to-end launch: still blocked by a live chain incident documented in [docs/CHAIN_INCIDENT.md](/Users/zmaxx/Projects/Ritual%20Mirror/docs/CHAIN_INCIDENT.md)

Production can run in two modes:

- Vercel-only: `apps/web` serves the UI and the status/chat API routes directly
- Split services: `apps/web` on Vercel plus `apps/worker` on a long-running container host

### Web on Vercel

The repo now includes [vercel.json](/Users/zmaxx/Projects/Ritual%20Mirror/vercel.json) so Vercel can build from the monorepo root with:

```bash
pnpm install --frozen-lockfile
pnpm --filter web build
```

Set these Vercel environment variables:

```env
NEXT_PUBLIC_RITUAL_RPC_URL=https://rpc.ritualfoundation.org
NEXT_PUBLIC_CHAIN_ID=1979
NEXT_PUBLIC_METADATA_BASE_URL=https://ritualmirror.xyz
NEXT_PUBLIC_HF_REPO_ID=Zmaxx81/ritual-mirror-workspace
NEXT_PUBLIC_REGISTRY_ADDRESS=0xEb135f44668e09Aea5341Cf167D6eB1d54910837
NEXT_PUBLIC_NFT_ADDRESS=0xaaA31769A56E88771867bF7f3E2E8bf1a9110dE5
NEXT_PUBLIC_SOVEREIGN_CONSUMER_ADDRESS=0x0e71Ef44054F04299CcbaE3eFfa76FE06057519C
NEXT_PUBLIC_AGENT_MANAGER_ADDRESS=0xaCa0F42E600473a34C432bf9c2078F4C6f09A22B
RITUAL_WORKER_URL=https://your-worker-host
```

`RITUAL_WORKER_URL` is now optional. If it is unset, the Next API routes use the built-in server-side status and relay handlers directly on Vercel.

### Worker service

The worker now supports a production `start` command, `PORT`, and an env-driven relay transport:

- [apps/worker/package.json](/Users/zmaxx/Projects/Ritual%20Mirror/apps/worker/package.json)
- [apps/worker/.env.example](/Users/zmaxx/Projects/Ritual%20Mirror/apps/worker/.env.example)
- [apps/worker/Dockerfile](/Users/zmaxx/Projects/Ritual%20Mirror/apps/worker/Dockerfile)

Expected worker env:

```env
PORT=8787
RITUAL_RPC_URL=https://rpc.ritualfoundation.org
REGISTRY_ADDRESS=0xEb135f44668e09Aea5341Cf167D6eB1d54910837
NFT_ADDRESS=0xaaA31769A56E88771867bF7f3E2E8bf1a9110dE5
SOVEREIGN_CONSUMER_ADDRESS=0x0e71Ef44054F04299CcbaE3eFfa76FE06057519C
AGENT_MANAGER_ADDRESS=0xaCa0F42E600473a34C432bf9c2078F4C6f09A22B
ASYNC_JOB_TRACKER_ADDRESS=0xC069FFCa0389f44eCA2C626e55491b0ab045AEF5
DA_PROVIDER=hf
HF_REPO_ID=Zmaxx81/ritual-mirror-workspace
RELAY_URL=https://your-relay-host
RELAY_POLL_TIMEOUT_MS=45000
RELAY_POLL_INTERVAL_MS=2000
```

Build / run:

```bash
pnpm --filter worker build
pnpm --filter worker start
```

## Factory-Backed Launch Flow

The Ritual-native launch path is script-driven, not browser-driven. This is intentional:

- Sovereign launch needs executor-key encrypted secrets for `LLM_PROVIDER` and `HF_TOKEN`.
- Persistent launch needs executor-key encrypted secrets for the model provider API key plus `HF_TOKEN`.
- Those blobs should stay server-side or operator-side, not in `NEXT_PUBLIC_*` envs.

Dry-run the launch scripts first:

```bash
pnpm ritual:agents:preflight 0xYOUR_OWNER
pnpm ritual:sovereign:launch ./tmp/genesis-payload.json
pnpm ritual:persistent:launch 0xYOUR_OWNER 0xPROFILE_HASH
```

`pnpm ritual:sovereign:launch` now defaults to the two-step harness flow:

1. `deployHarness(userSalt)`
2. `configureFundAndStart(...)`

This is the intended canonical production route because it gives a stable receiver address and clean monitoring via `AsyncJobTracker.JobAdded`, `ResultDelivered`, and harness callback events.

At the time of writing, the repository supports this path in code, but the live testnet run is still tracked as an open incident in [docs/CHAIN_INCIDENT.md](/Users/zmaxx/Projects/Ritual%20Mirror/docs/CHAIN_INCIDENT.md).

For this path, keep `SOVEREIGN_SCHEDULER_FREQUENCY >= 2000`. The script now hard-fails below that unless you explicitly set `SOVEREIGN_ALLOW_LOW_FREQUENCY=1` for debugging.

If native balance gets tight but your operator `RitualWallet` is unlocked, pull funds back first:

```bash
pnpm ritual:wallet:check 0xYOUR_OWNER
BROADCAST=1 pnpm ritual:wallet:withdraw 0.2
```

The launch scripts print predicted child addresses, selected executor, calldata, and funding requirements. Nothing is broadcast unless:

```bash
BROADCAST=1 pnpm ritual:sovereign:launch ./tmp/genesis-payload.json
BROADCAST=1 pnpm ritual:persistent:launch 0xYOUR_OWNER 0xPROFILE_HASH
```

If you explicitly want the older one-shot sovereign factory call, set:

```bash
SOVEREIGN_FACTORY_MODE=compressed pnpm ritual:sovereign:launch ./tmp/genesis-payload.json
```

After Phase 2 delivery completes through the real Ritual factory child contracts, bridge the result into the app registry:

```bash
BROADCAST=1 pnpm ritual:genesis:record 0xUSER 0xJOB_ID 0xPROFILE_HASH https://... hf://workspace/...
BROADCAST=1 pnpm ritual:launcher:record 0xUSER 0xLAUNCHER hf://workspace/...
```

For the live path, use the single finalize command after the sovereign callback arrives. It checks delivery, stops the Genesis harness, syncs the HF workspace, records Genesis into the registry, launches the persistent factory call, and records the launcher address:

```bash
pnpm ritual:genesis:finalize 0xUSER 0xJOB_ID 0xRECEIVER 0xPROFILE_HASH https://.../api/metadata/0xUSER

# live writes
BROADCAST=1 pnpm ritual:genesis:finalize 0xUSER 0xJOB_ID 0xRECEIVER 0xPROFILE_HASH https://.../api/metadata/0xUSER
```

If you only want the Genesis bridge and HF sync, disable the persistent leg:

```bash
FINALIZE_PERSISTENT=0 BROADCAST=1 pnpm ritual:genesis:finalize 0xUSER 0xJOB_ID 0xRECEIVER 0xPROFILE_HASH https://.../api/metadata/0xUSER
```

If you need to stop a sovereign harness manually after the first callback:

```bash
BROADCAST=1 pnpm ritual:sovereign:stop 0xHARNESS
```

This repo now includes a local helper for encrypted secret generation:

```bash
pnpm ritual:secrets:generate
```

The ciphertext must still be regenerated whenever the selected executor public key changes.

## Ritual Integration Status

The repository now contains:

- direct Sovereign monitoring that resolves effective async job identity from `AsyncJobTracker` logs,
- factory-backed sovereign launch with two-step harness mode as the default,
- explicit harness stop after the first Genesis callback,
- explicit operator bridge transactions for registry updates.

Live testnet verification is still required for:

- encrypted secret blob generation,
- HF workspace file availability,
- actual Phase 2 callback delivery on Ritual testnet,
- final live relay URL from the spawned Persistent Agent deployment.

For the latest live blocker and release guidance, see [docs/CHAIN_INCIDENT.md](/Users/zmaxx/Projects/Ritual%20Mirror/docs/CHAIN_INCIDENT.md).
