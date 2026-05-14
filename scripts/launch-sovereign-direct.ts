import { encodeAbiParameters, getAddress, isAddress, parseAbiParameters, toFunctionSelector } from "viem";
import {
  mirrorGenesisPrompt,
  ritualTestnet,
  sovereignRepoRefs,
  type MirrorGenesisPayload
} from "@ritual-mirror/ritual";
import {
  buildClients,
  loadJsonFile,
  maybeBroadcast,
  optionalBigInt,
  optionalNumber,
  parseEncryptedSecretHex,
  requireEnv,
  selectHttpExecutor
} from "./_ritual-operator";

const sovereignAgentAbi = parseAbiParameters([
  "address, uint256, bytes,",
  "uint64, uint64, string,",
  "address, bytes4, uint256, uint256, uint256,",
  "uint16, string, bytes,",
  "(string,string,string), (string,string,string),",
  "(string,string,string)[],",
  "(string,string,string),",
  "string, string[], uint16, uint32, string"
].join(""));

const sovereignPrecompile = "0x000000000000000000000000000000000000080C" as const;

async function main() {
  const payloadPath = process.argv[2];
  const receiverArg = process.argv[3];
  if (!payloadPath || !receiverArg) {
    throw new Error("Usage: pnpm ritual:sovereign:direct <payload-json-file> <receiver-address>");
  }
  if (!isAddress(receiverArg)) {
    throw new Error("Receiver must be a valid address.");
  }

  const payload = loadJsonFile<MirrorGenesisPayload>(payloadPath);
  const { account, walletClient, rpcUrl } = buildClients();
  const owner = getAddress(payload.owner);
  if (owner !== account.address) {
    throw new Error(`Payload owner ${owner} does not match PRIVATE_KEY account ${account.address}.`);
  }

  const repoId = requireEnv("HF_REPO_ID");
  const model = process.env.MODEL ?? "zai-org/GLM-4.7-FP8";
  const cliType = optionalNumber("SOVEREIGN_CLI_TYPE", 6);
  const encryptedSecrets = parseEncryptedSecretHex("SOVEREIGN_ENCRYPTED_SECRETS_HEX");
  const prompt = process.env.SOVEREIGN_PROMPT ?? mirrorGenesisPrompt(payload);
  const maxTurns = optionalNumber("SOVEREIGN_MAX_TURNS", 1);
  const maxTokens = optionalNumber("SOVEREIGN_MAX_TOKENS", 4096);
  const executor = await selectHttpExecutor();
  const refs = sovereignRepoRefs(owner, repoId);

  const receiver = getAddress(receiverArg);
  const data = encodeAbiParameters(sovereignAgentAbi, [
    executor.teeAddress,
    BigInt(optionalNumber("SOVEREIGN_TTL", 500)),
    "0x",
    BigInt(optionalNumber("SOVEREIGN_POLL_INTERVAL_BLOCKS", 5)),
    BigInt(optionalNumber("SOVEREIGN_MAX_POLL_BLOCK", 6000)),
    "RITUAL_MIRROR_GENESIS",
    receiver,
    toFunctionSelector("onSovereignAgentResult(bytes32,bytes)"),
    optionalBigInt("SOVEREIGN_DELIVERY_GAS_LIMIT", 3_000_000n),
    optionalBigInt("SOVEREIGN_DELIVERY_MAX_FEE_PER_GAS", 5_000_000_000n),
    optionalBigInt("SOVEREIGN_DELIVERY_MAX_PRIORITY_FEE_PER_GAS", 1_000_000_000n),
    cliType,
    prompt,
    encryptedSecrets,
    [refs.convoHistory.platform, refs.convoHistory.path, refs.convoHistory.keyRef],
    [refs.output.platform, refs.output.path, refs.output.keyRef],
    [],
    [refs.systemPrompt.platform, refs.systemPrompt.path, refs.systemPrompt.keyRef],
    model,
    [],
    maxTurns,
    maxTokens,
    JSON.stringify({ ritual: rpcUrl })
  ]);

  if (!maybeBroadcast()) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          chainId: ritualTestnet.id,
          owner,
          receiver,
          executor,
          cliType,
          model,
          calldata: data
        },
        null,
        2
      )
    );
    return;
  }

  const hash = await walletClient.sendTransaction({
    account,
    to: sovereignPrecompile,
    data,
    gas: 5_000_000n,
    chain: ritualTestnet
  });

  console.log(
    JSON.stringify(
      {
        mode: "broadcast",
        owner,
        receiver,
        txHash: hash
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
