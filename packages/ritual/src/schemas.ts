import { z } from "zod";

export const builderTypes = [
  "Protocol Operator",
  "Developer",
  "Founder",
  "Researcher",
  "Artist",
  "Trader",
  "Agent Operator"
] as const;

export const mirrorGenesisInputSchema = z.object({
  wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  nickname: z.string().min(1).max(80),
  bio: z.string().min(20).max(2000),
  xUrl: z.string().url().optional().or(z.literal("")),
  githubUrl: z.string().url().optional().or(z.literal("")),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  projectIdea: z.string().min(10).max(2000),
  builderType: z.enum(builderTypes),
  responseStyle: z.string().max(500).optional()
});

export const nftTraitSchema = z.object({
  trait_type: z.string(),
  value: z.string()
});

export const mirrorProfileSchema = z.object({
  mirrorName: z.string().min(1),
  archetype: z.string().min(1),
  mission: z.string().min(1),
  strengths: z.array(z.string()).min(1),
  blindSpots: z.array(z.string()).min(1),
  ritualPrimitiveFit: z.array(z.string()).min(1),
  voiceStyle: z.string().min(1),
  agentPrompt: z.string().min(1),
  memorySeed: z.string().min(1),
  nftTraits: z.array(nftTraitSchema),
  shareText: z.string().min(1),
  imagePrompt: z.string().optional()
});

export type MirrorGenesisInput = z.infer<typeof mirrorGenesisInputSchema>;
export type MirrorProfile = z.infer<typeof mirrorProfileSchema>;
