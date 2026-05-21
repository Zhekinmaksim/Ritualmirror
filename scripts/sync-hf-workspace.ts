import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { getAddress } from "viem";
import {
  mirrorGenesisPrompt,
  mirrorProfileSchema,
  requiredAgentFiles,
  type MirrorGenesisPayload,
  type MirrorProfile
} from "@ritual-mirror/ritual";
import { buildClients, loadJsonFile, requireEnv } from "./_ritual-operator";

const HF_API = "https://huggingface.co/api";
const DEFAULT_REPO_NAME = "ritual-mirror-workspace";

type WhoAmIResponse = {
  name?: string;
  fullname?: string;
  auth?: { accessToken?: { role?: string } };
};

function isPlaceholderRepo(repoId: string) {
  return (
    repoId.includes("yourname/") ||
    repoId.includes("your-hf-handle/") ||
    repoId === DEFAULT_REPO_NAME
  );
}

async function hfRequest<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${HF_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Hugging Face API ${path} failed: ${response.status} ${body}`);
  }

  return (await response.json()) as T;
}

async function resolveRepoId(token: string) {
  const configured = process.env.HF_REPO_ID;
  if (configured && !isPlaceholderRepo(configured)) {
    return configured;
  }

  const whoami = await hfRequest<WhoAmIResponse>(token, "/whoami-v2");
  if (!whoami.name) {
    throw new Error("Unable to resolve Hugging Face username from token.");
  }

  return `${whoami.name}/${DEFAULT_REPO_NAME}`;
}

async function ensureDatasetRepo(token: string, repoId: string) {
  const [namespace, name] = repoId.split("/");
  if (!namespace || !name) {
    throw new Error(`HF_REPO_ID must be in namespace/name form. Received: ${repoId}`);
  }

  const response = await fetch(`${HF_API}/repos/create`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      type: "dataset",
      name,
      organization: namespace,
      private: false
    })
  });

  if (response.ok) {
    return;
  }

  const text = await response.text();
  if (response.status === 409 || text.toLowerCase().includes("already exists")) {
    return;
  }

  throw new Error(`Failed to create HF dataset repo ${repoId}: ${response.status} ${text}`);
}

function renderSoul(profile?: MirrorProfile) {
  const template = readFileSync(resolve(process.cwd(), "agents/persistent-mirror/SOUL.md"), "utf8");
  if (!profile) return template;

  return [
    "# Runtime Binding",
    "",
    `Mirror name: ${profile.mirrorName}`,
    `Archetype: ${profile.archetype}`,
    `Mission: ${profile.mission}`,
    `Voice: ${profile.voiceStyle}`,
    "",
    "## Persistent prompt",
    "",
    profile.agentPrompt,
    "",
    "---",
    "",
    template
  ].join("\n");
}

function renderIdentity(owner: string, profile?: MirrorProfile) {
  const template = readFileSync(resolve(process.cwd(), "agents/persistent-mirror/IDENTITY.md"), "utf8");
  return [
    "# On-chain identity",
    "",
    `Owner wallet: ${owner}`,
    profile ? `Mirror name: ${profile.mirrorName}` : "Mirror name: pending Genesis callback",
    profile ? `Archetype: ${profile.archetype}` : "Archetype: pending Genesis callback",
    profile ? `Voice style: ${profile.voiceStyle}` : "Voice style: pending Genesis callback",
    "",
    "---",
    "",
    template
  ].join("\n");
}

function renderMemory(profile?: MirrorProfile) {
  const template = readFileSync(resolve(process.cwd(), "agents/persistent-mirror/MEMORY.md"), "utf8");
  return [
    "# Memory seed",
    "",
    profile ? profile.memorySeed : "Pending Genesis callback. Seed not written yet.",
    "",
    "---",
    "",
    template
  ].join("\n");
}

function renderTools() {
  return readFileSync(resolve(process.cwd(), "agents/persistent-mirror/TOOLS.md"), "utf8");
}

function renderSystemPrompt(payload?: MirrorGenesisPayload) {
  const template = readFileSync(resolve(process.cwd(), "agents/mirror-genesis/SYSTEM_PROMPT.md"), "utf8");
  if (!payload) return template;

  return [template, "", "## Current payload", "", mirrorGenesisPrompt(payload)].join("\n");
}

function renderManifest(owner: string, repoId: string, profile?: MirrorProfile) {
  return JSON.stringify(
    {
      version: 1,
      protocol: "ritual-mirror",
      daProvider: "hf",
      da_provider: "hf",
      owner,
      repoId,
      generatedAt: new Date().toISOString(),
      mirrorName: profile?.mirrorName,
      archetype: profile?.archetype,
      voiceStyle: profile?.voiceStyle,
      files: requiredAgentFiles
    },
    null,
    2
  );
}

function writeFile(target: string, content: string) {
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content, "utf8");
}

function upsertEnvValue(filePath: string, key: string, value: string) {
  let source = "";
  try {
    source = readFileSync(filePath, "utf8");
  } catch {
    source = "";
  }

  const line = `${key}=${value}`;
  if (!source) {
    writeFileSync(filePath, `${line}\n`, "utf8");
    return;
  }

  if (new RegExp(`^${key}=`, "m").test(source)) {
    const next = source.replace(new RegExp(`^${key}=.*$`, "m"), line);
    writeFileSync(filePath, next.endsWith("\n") ? next : `${next}\n`, "utf8");
    return;
  }

  const suffix = source.endsWith("\n") ? "" : "\n";
  writeFileSync(filePath, `${source}${suffix}${line}\n`, "utf8");
}

function runGit(args: string[], cwd: string) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8"
  });

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || `git ${args.join(" ")} failed`);
  }

  return result.stdout.trim();
}

async function main() {
  const ownerArg = process.argv[2];
  const payloadPath = process.argv[3];
  const profilePath = process.argv[4];
  const token = requireEnv("HF_TOKEN");
  const repoId = await resolveRepoId(token);
  const { account } = buildClients();
  const owner = getAddress(ownerArg ?? account.address);
  const payload = payloadPath ? loadJsonFile<MirrorGenesisPayload>(payloadPath) : undefined;
  const profile = profilePath ? mirrorProfileSchema.parse(loadJsonFile<unknown>(profilePath)) : undefined;
  const authOrigin = `https://__token__:${encodeURIComponent(token)}@huggingface.co/datasets/${repoId}`;

  await ensureDatasetRepo(token, repoId);

  const tempRoot = mkdtempSync(join(tmpdir(), "ritual-mirror-hf-"));
  const repoDir = join(tempRoot, "repo");
  runGit(["clone", authOrigin, repoDir], tempRoot);

  const base = join(repoDir, "ritual-mirror", owner.toLowerCase());
  writeFile(join(repoDir, "README.md"), "# Ritual Mirror Workspace\n\nDataset workspace for Ritual Mirror agent state.\n");
  writeFile(join(base, "prompts", "system.md"), renderSystemPrompt(payload));
  writeFile(join(base, "manifest.json"), renderManifest(owner, repoId, profile));
  writeFile(join(base, "SOUL.md"), renderSoul(profile));
  writeFile(join(base, "IDENTITY.md"), renderIdentity(owner, profile));
  writeFile(join(base, "MEMORY.md"), renderMemory(profile));
  writeFile(join(base, "TOOLS.md"), renderTools());
  writeFile(join(base, "sessions", "session.jsonl"), "");
  writeFile(join(base, "artifacts", ".gitkeep"), "");

  spawnSync("git", ["config", "user.name", "Ritual Mirror Operator"], { cwd: repoDir });
  spawnSync("git", ["config", "user.email", "ritual-mirror@local"], { cwd: repoDir });
  runGit(["add", "."], repoDir);

  const diff = spawnSync("git", ["status", "--porcelain"], { cwd: repoDir, encoding: "utf8" });
  if ((diff.stdout ?? "").trim()) {
    runGit(["commit", "-m", `Sync Ritual Mirror workspace for ${owner}`], repoDir);
    runGit(["push", "origin", "HEAD:main"], repoDir);
  }

  upsertEnvValue(resolve(process.cwd(), ".env"), "HF_REPO_ID", repoId);
  upsertEnvValue(resolve(process.cwd(), ".env"), "NEXT_PUBLIC_HF_REPO_ID", repoId);
  upsertEnvValue(resolve(process.cwd(), "apps/web/.env.local"), "NEXT_PUBLIC_HF_REPO_ID", repoId);

  console.log(
    JSON.stringify(
      {
        repoId,
        owner,
        workspaceURI: `hf://${repoId}/ritual-mirror/${owner.toLowerCase()}`,
        profileBound: !!profile,
        payloadBound: !!payload,
        tempRoot
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
