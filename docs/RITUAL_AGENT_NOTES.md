# Ritual Agent Notes

Source of truth: `.codex/skills/ritual-dapp-skills`, installed from `https://github.com/ritual-foundation/ritual-dapp-skills.git`.

## Chain

- Chain ID: `1979`
- Currency: `RITUAL`
- HTTP RPC: `https://rpc.ritualfoundation.org`
- WebSocket RPC: `wss://rpc.ritualfoundation.org/ws`
- Explorer: `https://explorer.ritualfoundation.org`
- Block time: about `350ms`

## Agent Primitives

- Sovereign Agent precompile: `0x000000000000000000000000000000000000080C`
- Persistent Agent precompile: `0x0000000000000000000000000000000000000820`
- Sovereign Agent factory: `0x9dC4C054e53bCc4Ce0A0Ff09E890A7a8e817f304`
- Persistent Agent factory: `0xD4AA9D55215dc8149Af57605e70921Ea16b73591`

Ritual Mirror should use factory-backed mode for the real product path. Direct precompile calls are useful only for ABI and smoke-test work.

## System Contracts

- RitualWallet: `0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948`
- AsyncJobTracker: `0xC069FFCa0389f44eCA2C626e55491b0ab045AEF5`
- TEEServiceRegistry: `0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F`
- Scheduler: `0x56e776BAE2DD60664b69Bd5F865F1180ffB7D58B`
- SecretsAccessControl: `0xf9BF1BC8A3e79B9EBeD0fa2Db70D0513fecE32FD`
- AsyncDelivery: `0x5A16214fF555848411544b005f7Ac063742f39F6`
- AgentHeartbeat: `0xEF505E801f1Db392B5289690E2ffc20e840A3aCa`
- ModelPricingRegistry: `0x7A85F48b971ceBb75491b61abe279728F4c4384f`

## Non-Negotiable Integration Rules

- Two-phase async callbacks must authenticate `msg.sender == AsyncDelivery` or the verified factory/harness path.
- Each EOA can have only one pending async job at a time. The frontend must serialize Genesis, spawn, image, and other two-phase calls.
- Two-phase async fee checks use the signing EOA's RitualWallet balance, not only the consumer contract balance.
- Persistent Agent requires DA. First target: `DA_PROVIDER=hf` with `HF_TOKEN` and `HF_REPO_ID`.
- Query `TEEServiceRegistry.getServicesByCapability(0, true)` for executors that support agent precompiles.

## Verification Commands

```bash
cast code 0x9dC4C054e53bCc4Ce0A0Ff09E890A7a8e817f304 --rpc-url "$RITUAL_RPC_URL"
cast code 0xD4AA9D55215dc8149Af57605e70921Ea16b73591 --rpc-url "$RITUAL_RPC_URL"
cast call 0x9dC4C054e53bCc4Ce0A0Ff09E890A7a8e817f304 "scheduler()(address)" --rpc-url "$RITUAL_RPC_URL"
cast call 0xD4AA9D55215dc8149Af57605e70921Ea16b73591 "ritualWallet()(address)" --rpc-url "$RITUAL_RPC_URL"
```

Project scripts:

```bash
pnpm ritual:factories:check
pnpm ritual:wallet:check 0xYourWallet
pnpm ritual:jobs:check 0xYourWallet
pnpm ritual:agents:preflight 0xYourWallet
```

Latest read-only preflight using a dummy owner confirmed:

- Sovereign factory code present.
- Persistent factory code present.
- `TEEServiceRegistry.getServicesByCapability(0, true)` returned executors.
- `predictHarness`, `predictLauncher`, and `getDkmsDerivation` calls succeeded.
