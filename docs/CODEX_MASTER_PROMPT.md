You are building Ritual Mirror.

Ritual Mirror is a full Ritual-native agent dApp on Ritual Chain testnet.

Product:
A user connects a wallet, enters bio/social/project context, and creates a living on-chain AI mirror.

Architecture:
1. Sovereign Agent creates the Mirror Genesis profile.
2. Persistent Agent is spawned as the user's living Mirror.
3. Mirror identity and memory are stored via DA.
4. Mirror NFT represents the identity.
5. User can chat with the Mirror through a relay/API.
6. Scheduler can trigger periodic self-reflection/evolution.

Tech:
- Next.js App Router
- TypeScript
- Tailwind
- wagmi / viem
- Foundry
- Solidity ^0.8.28
- Ritual Chain testnet, Chain ID 1979
- RPC: https://rpc.ritualfoundation.org
- Use Ritual dApp skills from .codex/skills/ritual-dapp-skills
- Use Sovereign Agent and Persistent Agent patterns
- Use factory-backed mode where appropriate
- Use DA_PROVIDER=hf for first full version
- Never hardcode secrets
- No mock-only architecture
- Every feature must have tests or verification scripts

Important:
Do not build a generic LLM app.
Do not fake the agent layer.
Do not hide TODOs as completed work.
If exact Ritual ABI/precompile encoding is uncertain, create verification scripts and document the uncertainty clearly.

Current task:
[PASTE TASK HERE]
