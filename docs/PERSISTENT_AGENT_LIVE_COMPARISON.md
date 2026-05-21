# Persistent Agent Live Comparison

Date: 2026-05-20

## Live successful agent used for comparison

- Agent address: `0x28e8Fc2c4D714112fB5f540Dd16e50c21cf50112`
- Owner: `0x81aA70De005eadDD5540237EE560913c82b7743b`
- Executor: `0xA6f6159C4D978E46eecF74588D3b099Cd15cfc91`
- Heartbeat contract: `0xEF505E801f1Db392B5289690E2ffc20e840A3aCa`
- Sample successful heartbeat tx: `0x86ee0db3684cf767284d423b29f8c058c50c61bd2ec8a21e34fd46e3cff75941`

`getAgentInfo(agent)` on Ritual heartbeat returns:

- `lastHeartbeatBlock = 21232850`
- `heartbeatTimeout = 5000`
- `latestManifestCID = "persistent-agents/0x28e8fc2c4d714112fb5f540dd16e50c21cf50112/manifest.json"`
- `isAlive = true`

## What the live agent proves

The live runtime is successfully heartbeating with the same executor we use.

The public manifest path that reaches heartbeat is:

`persistent-agents/<agentAddress>/manifest.json`

That does **not** look like our original custom HF workspace path:

`ritual-mirror/<owner>/manifest.json`

## Official persistent example shape

From `.codex/skills/ritual-dapp-skills/examples/persistent-agent/helpers.py`:

- `daConfig` for HF is built as:
  - `("hf", HF_REPO_ID, "HF_TOKEN")`
- `SOUL`, `MEMORY`, `IDENTITY`, `TOOLS` are sent as `inline` refs
- runtime config is also sent as `inline`
- encrypted secrets for HF DA need at least:
  - `HF_TOKEN`
- encrypted secrets also include the chosen LLM key only

This is materially different from our original payload.

## Original Ritual Mirror payload

Before this comparison, Ritual Mirror was sending:

- `daConfig = ["hf", "<repo>/ritual-mirror/<owner>/manifest.json", "HF_TOKEN"]`
- `soulRef`, `memoryRef`, `identityRef`, `toolsRef` as HF storage refs
- custom manifest schema written to our HF workspace ahead of spawn

That shape is not what the official example uses.

## Runtime symptoms seen on our project

### Shape 1: custom workspace refs

Direct persistent spawn reached Phase 2 callback, but executor returned:

`DA provider is empty — cannot spawn agent without explicit da_provider (ipfs, pinata, hf, or gcs)`

This strongly suggests our public DA shape was not being interpreted as a valid persistent-agent DA config.

### Shape 2: official-style compact payload

We changed direct launch to:

- `daConfig = ["hf", HF_REPO_ID, "HF_TOKEN"]`
- inline docs for soul/memory/identity/tools
- inline runtime config for heartbeat chain

The payload now matches the official example far more closely.

`viem` still hit an RPC acceptance issue on this shape, but `cast send` works.

That means the payload shape itself is valid; the failure was transport-specific.

## Practical conclusion

The strongest live comparison result is:

1. successful persistent agents on Ritual are real and live,
2. their public manifest shape matches the official example model,
3. our original custom HF manifest path is not a safe canonical persistent-agent shape,
4. the next retry path should stay on the official compact model and switch submission method if needed (`cast send` / official helper path), instead of going back to custom workspace refs.

## Additional bootstrap findings

- Our successful direct spawn for `0xA1C0683fD6D5704133dc0156789e8a5432949078` reached Phase 2 successfully and returned:
  - non-empty `INSTANCE_ID`
  - non-empty `CONTAINER_ID`
  - non-empty `GATEWAY_TOKEN`
  - empty `GATEWAY_URL`
  - empty `CHECKPOINT_CID`
  - empty `ERROR_MESSAGE`
- We initially treated `INSTANCE_ID` as the only relevant runtime address, but the official example includes a missing bootstrap step before spawn:
  1. derive the child DKMS heartbeat/payment address through `0x081B`
  2. fund that child address before expecting monitoring to work
- On our deployment, the DKMS result for the same owner/executor returned:
  - `PAYMENT_ADDRESS = 0xA1C0683fD6D5704133dc0156789e8a5432949078`
  - so the child DKMS address and returned `INSTANCE_ID` are the same address in this case
- The real missing production step was **canonical child funding**, not just direct spawn.
- After:
  - replaying the direct spawn with `AGENT_RUNTIME=hermes`
  - deriving the DKMS child/payment address through `callDKMSKey(bytes)`
  - increasing child native balance to `0.589689657962827606 RITUAL`
  the chain flipped to:
  - `AgentHeartbeat.isAlive(instance) = true`

That establishes the actual bootstrap requirement for Ritual Mirror:

1. derive child DKMS/payment address,
2. fund it materially,
3. then evaluate monitored state.

For the next retry, the direct launcher was updated to match the official helper more closely:

- `AGENT_RUNTIME` is now configurable (`zeroclaw` or `hermes`)
- optional heartbeat loop config is supported through:
  - `HEARTBEAT_INTERVAL`
  - `HEARTBEAT_PROMPT`
- `scripts/bootstrap-persistent-dkms.ts` now codifies the missing DKMS derivation/funding step for the direct path

The remaining unresolved production item is no longer heartbeat registration. It is transport:

- `GATEWAY_URL` is still empty
- `RELAY_URL` is still operator-supplied
- chat transport remains blocked until a real relay endpoint exists
