# Ritual Agent Flow

## Projection

Ritual Mirror maps to these native Ritual capabilities:

- Identity generation: Sovereign Agent long-running async precompile.
- Living identity/memory: Persistent Agent long-running async precompile.
- Periodic evolution: Scheduler.
- Fee handling: RitualWallet.
- Job status: AsyncJobTracker.
- Callback delivery: AsyncDelivery.
- Executor discovery: TEEServiceRegistry HTTP capability `0`.

## Genesis

Input:

- wallet
- nickname
- bio
- X URL
- GitHub URL
- website URL
- project idea
- builder type
- desired personality

Output:

- strict `MirrorProfile`
- DA workspace reference
- metadata URI
- profile hash

## Persistent Agent

The Persistent Mirror receives:

- `SOUL.md`
- `IDENTITY.md`
- `MEMORY.md`
- `TOOLS.md`
- generated `agentPrompt`
- generated `memorySeed`
- owner wallet
- registry contract address

The agent is not optional. If the persistent launcher is unavailable, the UI must show an offline/incomplete state instead of returning mock chat.

## Failure Modes

- EOA lacks RitualWallet balance.
- EOA lock duration is shorter than job TTL.
- EOA already has a pending async job.
- No valid HTTP capability executor is available.
- DA provider credentials missing.
- AsyncDelivery callback fails or runs out of gas.
- Persistent launcher deploys but agent heartbeat is offline.
