import { encodeAbiParameters, parseAbiParameters } from "viem";
import { createGenesisPayload, mirrorGenesisInputSchema } from "@ritual-mirror/ritual";

const sample = {
  wallet: "0x0000000000000000000000000000000000000001",
  nickname: "zmaxx",
  bio: "A builder creating agent-native crypto products on Ritual Chain.",
  xUrl: "",
  githubUrl: "",
  websiteUrl: "",
  projectIdea: "Register a runtime record with Genesis output, DA refs, and a token anchor.",
  builderType: "Protocol Operator",
  responseStyle: "terse, technical, cautious"
};

const input = mirrorGenesisInputSchema.parse(sample);
const payload = createGenesisPayload(input.wallet, input);
const json = JSON.stringify(payload);
const encoded = encodeAbiParameters(parseAbiParameters("string"), [json]);

console.log(JSON.stringify({
  json,
  encoded,
  profileHash: payload.profileHash,
  note: "Use this payload for the Sovereign Genesis launch once factory params are wired."
}, null, 2));
