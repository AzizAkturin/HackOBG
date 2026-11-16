import type { FightEvent } from "@wab/shared";
import {
  runFighter as gatewayRunFighter,
  type KoReason,
  type RunFighterOptions,
  type RunResult,
} from "../llm/gateway.ts";
import { createMoveState, estimateTokens, MOVE_THRESHOLDS, step, type MoveInput } from "./moves.ts";
import { buildMessages, lastWords, PITCH_MAX_WORDS, splitPitch } from "./prompt.ts";
import type { FightLimits, FightTask, FighterOutcome, FighterSpec } from "./types.ts";

export const KO_PITCH = "I got knocked out before I could pitch.";

const KO_STATUS: Record<KoReason, string> = {
  timeout: "Out of time",
  budget_exhausted: "Out of tokens",
  http_error: "Knocked out",
  empty: "No answer",
  aborted: "Stopped",
};

export type RunFightArgs = {
  roundId: number;
  task: FightTask;
  fighters: FighterSpec[];
  limits: FightLimits;
  emit: (event: FightEvent) => void;
  runFighter?: (opts: RunFighterOptions) => Promise<RunResult>;
  now?: () => number;
};

export async function runFight(args: RunFightArgs): Promise<FighterOutcome[]> {
  const { task, fighters, limits, emit } = args;
  const run = args.runFighter ?? gatewayRunFighter;
  const now = args.now ?? Date.now;
  const startedAt = now();
  const elapsed = () => now() - startedAt;
  const abort = new AbortController();
  let finishedCount = 0;

  emit({ kind: "phase", phase: "fighting", endsAt: startedAt + limits.fightSeconds * 1000 });

  const lanes = fighters.map((fighter) => {
    let state = createMoveState({ fighter: fighter.idx, budget: limits.maxTokens });
    return {
      fighter,
      active: true,
      feed(input: MoveInput) {
        const next = step(state, input);
        state = next.state;
        for (const event of next.events) emit(event);
      },
    };
  });
  type Lane = (typeof lanes)[number];

  const finish = (lane: Lane, content: string, tokensUsed: number): FighterOutcome => {
    const finishedAtMs = elapsed();
    const split = splitPitch(content);
    const output = split.pitch === null ? content.trim() : split.result;
    const pitch = split.pitch ?? lastWords(output, PITCH_MAX_WORDS);
    const first = finishedCount++ === 0;
    emit({ kind: "finished", fighter: lane.fighter.idx, atMs: finishedAtMs });
    lane.feed({ type: "finished", tMs: finishedAtMs, first });
    return { status: "finished", idx: lane.fighter.idx, output, pitch, tokensUsed, finishedAtMs };
  };

  const conclude = (lane: Lane, result: RunResult): FighterOutcome => {
    if (result.status === "finished") {
      const tokens =
        result.usage?.completionTokens ?? estimateTokens(result.content.length + result.reasoningChars);
      return finish(lane, result.content, tokens);
    }
    const partialTokens = estimateTokens(result.partialContent.length);
    if (result.reason === "timeout" && splitPitch(result.partialContent).pitch !== null) {
      return finish(lane, result.partialContent, partialTokens);
    }
    const finishedAtMs = elapsed();
    emit({ kind: "status", fighter: lane.fighter.idx, text: KO_STATUS[result.reason] });
    emit({ kind: "ko", fighter: lane.fighter.idx, reason: result.reason });
    return {
      status: "ko",
      idx: lane.fighter.idx,
      reason: result.reason,
      output: result.partialContent,
      pitch: KO_PITCH,
      tokensUsed: partialTokens,
      finishedAtMs,
    };
  };

  const fight = async (lane: Lane): Promise<FighterOutcome> => {
    const result = await run({
      entry: lane.fighter.model,
      messages: buildMessages(lane.fighter, task, limits),
      maxTokens: limits.maxTokens,
      deadlineMs: limits.fightSeconds * 1000,
      signal: abort.signal,
      onDelta: (d) => lane.feed({ type: "delta", kind: d.kind, text: d.text, tMs: elapsed() }),
      onRetry: () => lane.feed({ type: "retry", tMs: elapsed() }),
    });
    lane.active = false;
    return conclude(lane, result);
  };

  const timer = setInterval(() => {
    for (const lane of lanes) if (lane.active) lane.feed({ type: "tick", tMs: elapsed() });
  }, MOVE_THRESHOLDS.tickMs);

  try {
    const outcomes = await Promise.all(lanes.map(fight));
    return outcomes.sort((a, b) => a.idx - b.idx);
  } finally {
    clearInterval(timer);
    abort.abort();
  }
}
