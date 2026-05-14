# Ritual Mirror Spec

## Product Concept

Ritual Mirror creates a living on-chain AI mirror for a builder. A user connects a wallet, submits identity context, launches a Ritual Sovereign Agent to create Mirror Genesis, then spawns a Ritual Persistent Agent that keeps identity and memory alive through DA. A Mirror NFT represents the agent identity.

One-liner:

```text
Create your living on-chain AI mirror on Ritual.
```

## User Flow

1. User opens `ritualmirror.xyz`.
2. User connects a Ritual Chain testnet wallet.
3. App checks RitualWallet balance, lock, and pending async job state.
4. User submits wallet, nickname, bio, social links, project idea, builder type, and desired personality.
5. Contract launches a Sovereign Agent Genesis job through factory-backed mode.
6. Async result is delivered through the Ritual callback path and stored as `MirrorProfile`.
7. User spawns a Persistent Agent with DA-backed workspace files.
8. User mints a Mirror NFT linked to the profile and persistent agent.
9. User opens `/mirror/[address]` and chats with the living Mirror.
10. Scheduler can trigger periodic self-reflection updates.

## MVP Scope

- Monorepo with web, worker, contracts, shared Ritual package, docs, and agent workspaces.
- Registry, NFT, Sovereign consumer, and Agent manager contracts.
- Strict `MirrorProfile` schema.
- Agent prompt/workspace templates.
- Ritual constants from official dApp skills.
- UI pages for lifecycle steps and public mirror pages.
- Worker endpoints that expose status and refuse to silently mock agent responses.
- Foundry tests for registry/NFT lifecycle.

## Non-MVP Scope

- Production-grade relayer auth.
- Full DA upload implementation for all providers.
- Streaming chat transport.
- Cross-chain actions.
- Paid API/X402 flows.
- Production indexer database migrations.

## Ritual Primitives

| Capability | Ritual Primitive |
|---|---|
| Genesis profile generation | Sovereign Agent `0x080C`, factory `0x9dC4...f304` |
| Living agent identity/memory | Persistent Agent `0x0820`, factory `0xD4AA...591` |
| Fee escrow | RitualWallet `0x532F...3948` |
| Async lifecycle | AsyncJobTracker `0xC069...AEF5` |
| Callback delivery | AsyncDelivery `0x5A16...39F6` |
| Executor discovery | TEEServiceRegistry `0x9644...Bf47F` |
| Scheduled reflection | Scheduler `0x56e7...D58B` |
| DA-backed memory | StorageRef through HF first |

## Smart Contracts

- `RitualMirrorRegistry`: canonical profile and lifecycle storage.
- `RitualMirrorNFT`: one NFT per wallet, linked to registry.
- `RitualMirrorSovereignConsumer`: launches and receives Mirror Genesis.
- `RitualMirrorAgentManager`: records persistent agent spawn lifecycle.

## Frontend Pages

- `/`: first-viewport product experience and lifecycle CTA.
- `/create`: identity intake.
- `/create/genesis`: Genesis job submission and async status.
- `/create/spawn`: Persistent Agent spawn flow.
- `/mirror/[address]`: public Mirror profile.
- `/mirror/[address]/chat`: chat surface with online/offline states.
- `/gallery`: placeholder discovery surface.
- `/how-it-works`: concise technical flow.

## Mirror Profile Schema

See `packages/ritual/src/schemas.ts`.

Required output:

- `mirrorName`
- `archetype`
- `mission`
- `strengths[]`
- `blindSpots[]`
- `ritualPrimitiveFit[]`
- `voiceStyle`
- `agentPrompt`
- `memorySeed`
- `nftTraits[]`
- `shareText`
- `imagePrompt`

## Security Notes

- Do not accept arbitrary callback senders.
- Serialize async jobs per EOA because Ritual has sender locks.
- Require RitualWallet funding and lock before two-phase jobs.
- Never hardcode private keys.
- Keep DA refs explicit and auditable.
- Do not silently fall back to mocks when persistent agent is offline.

## Demo Script

1. Connect wallet on Ritual testnet.
2. Show RitualWallet status.
3. Submit identity and launch Mirror Genesis.
4. Show job hash and explorer link.
5. Receive Genesis and preview Mirror card.
6. Spawn Persistent Mirror Agent.
7. Mint Mirror NFT.
8. Open public mirror page.
9. Ask: `What should I build next on Ritual?`
10. Show response provenance and agent status.
