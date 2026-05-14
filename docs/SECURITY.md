# Security

## Callback Authentication

Long-running async results must come through Ritual's trusted delivery path. Direct public result setters are only acceptable for local tests. Production callbacks must authenticate either `AsyncDelivery` or the specific factory-backed harness/launcher sender verified during deployment.

## Async Sender Lock

Ritual permits one pending async job per EOA. Frontend and worker flows must serialize Genesis, Persistent Agent spawn, media generation, and scheduled reflection setup.

## Fee Management

Two-phase async precompile fee checks use the signing EOA's RitualWallet balance. Depositing only into a consumer contract is insufficient for user-submitted jobs.

## Secrets

Do not commit secrets. DA and LLM provider keys must be stored as environment variables or encrypted Ritual secrets. The default target is `DA_PROVIDER=hf`.

## Metadata

NFT metadata can include public identity data. Do not include private social tokens, API keys, or hidden memory contents.

## Frontend Wallet Connection

- The web app uses the injected `window.ethereum` provider only after an explicit user click.
- The frontend never requests private keys, seed phrases, signatures, or approvals during basic connect.
- Account addresses returned by the wallet are validated and normalized with `viem`.
- `wallet_addEthereumChain` is attempted only when `wallet_switchEthereumChain` fails with unknown-chain code `4902`.
- Account state is held in React memory only; it is not written to `localStorage` or `sessionStorage`.
- Chain ID is re-read from the provider after network changes instead of being trusted optimistically.
