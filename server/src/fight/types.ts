import type { KoReason } from "../llm/gateway.ts";
import type { ModelEntry } from "../llm/models.ts";

export type FightTask = { prompt: string; category: string };

export type FighterSpec = {
  idx: number;
  name: string;
  persona: string;
  memories: string[];
  careerSummary?: string;
  model: ModelEntry;
};

export type FightLimits = { maxTokens: number; fightSeconds: number };

export type FighterOutcome =
  | { status: "finished"; idx: number; output: string; pitch: string; tokensUsed: number; finishedAtMs: number }
  | {
      status: "ko";
      idx: number;
      reason: KoReason;
      output: string;
      pitch: string;
      tokensUsed: number;
      finishedAtMs: number;
    };
