# Ritual Chain Incident

Current date: 2026-05-19

## Scope

This document tracks the live Ritual testnet blocker separately from the code release state.

The repository build is green and the frontend can be pushed and deployed independently.
The remaining blocker is the live Genesis path on Ritual testnet.

## Current Findings

### 1. Factory-backed scheduler bootstrap is not usable as the current production backbone

Observed harness:

- harness: `0xe2D0f7fCEd66E1135df5c51E34f2cccFBbe88601`
- active call id: `2014123`
- configure tx: `0xde5e7a534c9c7ba5fb0fc24bb5218f55abd86ed25ea8322f91e3af7b40a414b4`

Observed state:

- `CallScheduled` exists
- scheduler calldata selector matches `wakeUp(uint256,uint64)`
- payer balance existed
- payer lock coverage existed
- deterministic `TxScheduled` hash for execution index `0` was never found on RPC
- harness remained `SCHEDULED` with `Invoked=0`

Conclusion:

The scheduler-backed Genesis bootstrap did not materialize into a scheduled system transaction.
This is not a frontend issue and not a callback decoding issue.

### 2. Direct Sovereign Genesis path is valid, but requires a live RitualWallet lock

Direct receiver used:

- receiver: `0xa6F585a29EaeBd9ac1e6988B8e101eDc1e547973`

Live direct tx:

- tx hash: `0x7e201b3e786eae1bf0c7184ecf60e22e5cada768a21c6cadb3ed01c145378653`

Important validation result returned by Ritual RPC:

- `insufficient lock duration (required until block ..., locked until 0)`

After refreshing the operator `RitualWallet` lock, the direct tx was accepted and Phase 1 settled.

### 3. Direct Phase 1 settled, but long-tail observability is unstable

At one point the direct path resolved correctly:

- `JobAdded` found
- `phase1Settled: true`
- `pendingForSender: true`

Later polling against the same tx returned:

- tx not found
- receipt not found
- unresolved job lookup
- no pending sender lock

Conclusion:

The remaining blocker is no longer ingress validation.
The open problem is live RPC / async lifecycle observability after acceptance.

## Release Decision

The code release is not blocked by this incident.

Allowed now:

- push repository changes
- deploy frontend / worker preview
- publish a preview build for UI review

Not yet honest to claim:

- full Ritual-native production launch
- completed `Genesis -> callback -> finalize -> persistent launch`

## Next Live Steps

1. Reconcile the accepted direct tx against Ritual RPC and explorer history.
2. Confirm whether the job actually completed, was dropped, or became unobservable through the public RPC.
3. If direct callbacks remain unstable, route Genesis through a dedicated operator-run recovery flow instead of browser-visible "live success" messaging.
4. Only after a confirmed callback should `ritual:genesis:finalize` be treated as deploy-ready.
