import type { FightEvent } from "@wab/shared";

export const MOVE_THRESHOLDS = {
  tickMs: 250,
  charsPerToken: 4,
  progressMinGapMs: 250,
  snippetMinGapMs: 1000,
  snippetChars: 160,
  burstWindowMs: 500,
  baselineMinMs: 1000,
  burstFactor: 1.25,
  burstIntensityRatio: 3,
  sustainedWindows: 2,
  silentGapMs: 2500,
  noContentGapMs: 6000,
  circleRepeatMs: 4000,
  circleMaxGapMs: 10000,
  pitchIntensity: 1,
  headingIntensity: 0.8,
  statusMaxChars: 40,
} as const;

const T = MOVE_THRESHOLDS;

export type MoveInput =
  | { type: "delta"; kind: "content" | "reasoning"; text: string; tMs: number }
  | { type: "tick"; tMs: number }
  | { type: "retry"; tMs: number }
  | { type: "finished"; tMs: number; first: boolean };

export type MoveState = {
  fighter: number;
  budget: number;
  contentChars: number;
  reasoningChars: number;
  lastActivityMs: number;
  lastContentMs: number;
  lastCircleMs: number | null;
  firstContentMs: number | null;
  windowStartMs: number;
  windowStartChars: number;
  burstStreak: number;
  line: string;
  lineFired: boolean;
  headingOpen: boolean;
  thinking: boolean;
  pitching: boolean;
  tail: string;
  lastProgressMs: number | null;
  sentTokens: number;
  lastSnippetMs: number | null;
  sentTail: string;
};

export const estimateTokens = (chars: number) => Math.ceil(chars / T.charsPerToken);

export function createMoveState(init: { fighter: number; budget: number; startMs?: number }): MoveState {
  const startMs = init.startMs ?? 0;
  return {
    fighter: init.fighter,
    budget: init.budget,
    contentChars: 0,
    reasoningChars: 0,
    lastActivityMs: startMs,
    lastContentMs: startMs,
    lastCircleMs: null,
    firstContentMs: null,
    windowStartMs: startMs,
    windowStartChars: 0,
    burstStreak: 0,
    line: "",
    lineFired: false,
    headingOpen: false,
    thinking: false,
    pitching: false,
    tail: "",
    lastProgressMs: null,
    sentTokens: 0,
    lastSnippetMs: null,
    sentTail: "",
  };
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

const PITCH_LINE = /^\s*(?:#{1,6}\s*)?(?:\*\*|__)?pitch(?:\*\*|__)?\s*:/i;
const HEADING_LINE = /^\s*#{1,6}\s+\S/;

type Milestone = { intensity: number; pitch: boolean };

const status = (fighter: number, text: string): FightEvent => ({ kind: "status", fighter, text });

const headingText = (line: string) =>
  line.replace(/^\s*#{1,6}\s*/, "").replace(/[*_`]/g, "").trim().slice(0, T.statusMaxChars).trimEnd();

function scanLines(s: MoveState, text: string): { milestone: Milestone | null; headings: string[] } {
  let found: Milestone | null = null;
  const headings: string[] = [];
  const parts = text.split("\n");
  parts.forEach((part, i) => {
    if (i > 0) {
      if (s.headingOpen) headings.push(headingText(s.line));
      s.headingOpen = false;
      s.line = "";
      s.lineFired = false;
    }
    s.line += part;
    if (s.lineFired) return;
    const pitch = PITCH_LINE.test(s.line);
    if (pitch || HEADING_LINE.test(s.line)) {
      s.lineFired = true;
      s.headingOpen = !pitch;
      const hit = { intensity: pitch ? T.pitchIntensity : T.headingIntensity, pitch };
      if (!found || hit.pitch || !found.pitch) found = hit;
    }
  });
  return { milestone: found, headings: headings.filter(Boolean) };
}

function checkGap(s: MoveState, tMs: number, events: FightEvent[]) {
  const silent = tMs - s.lastActivityMs;
  const noContent = tMs - s.lastContentMs;
  const gap = silent >= T.silentGapMs ? silent : noContent >= T.noContentGapMs ? noContent : 0;
  if (gap === 0) return;
  if (s.lastCircleMs !== null && tMs - s.lastCircleMs < T.circleRepeatMs) return;
  events.push(status(s.fighter, "Still thinking"));
  events.push({ kind: "action", fighter: s.fighter, move: "circle", intensity: clamp01(gap / T.circleMaxGapMs) });
  s.lastCircleMs = tMs;
}

function flush(s: MoveState, tMs: number, events: FightEvent[]) {
  const tokens = Math.min(s.budget, estimateTokens(s.contentChars + s.reasoningChars));
  if (tokens !== s.sentTokens && (s.lastProgressMs === null || tMs - s.lastProgressMs >= T.progressMinGapMs)) {
    events.push({ kind: "progress", fighter: s.fighter, tokens, budget: s.budget });
    s.sentTokens = tokens;
    s.lastProgressMs = tMs;
  }
  if (s.tail !== s.sentTail && (s.lastSnippetMs === null || tMs - s.lastSnippetMs >= T.snippetMinGapMs)) {
    events.push({ kind: "snippet", fighter: s.fighter, text: s.tail });
    s.sentTail = s.tail;
    s.lastSnippetMs = tMs;
  }
}

function burstMove(s: MoveState, tMs: number): { move: "jab" | "combo"; intensity: number } | null {
  if (s.firstContentMs === null || tMs - s.windowStartMs < T.burstWindowMs) return null;
  const windowSec = (tMs - s.windowStartMs) / 1000;
  const rate = (s.contentChars - s.windowStartChars) / windowSec;
  const baselineSec = (s.windowStartMs - s.firstContentMs) / 1000;
  const average = baselineSec * 1000 >= T.baselineMinMs ? s.windowStartChars / baselineSec : 0;
  s.windowStartMs = tMs;
  s.windowStartChars = s.contentChars;
  if (average <= 0 || rate < average * T.burstFactor) {
    s.burstStreak = 0;
    return null;
  }
  s.burstStreak++;
  return {
    move: s.burstStreak >= T.sustainedWindows ? "combo" : "jab",
    intensity: clamp01(rate / average / T.burstIntensityRatio),
  };
}

function onDelta(state: MoveState, input: Extract<MoveInput, { type: "delta" }>) {
  const s = { ...state };
  const events: FightEvent[] = [];
  const { tMs, text } = input;
  checkGap(s, tMs, events);
  s.lastActivityMs = tMs;

  if (input.kind === "reasoning") {
    if (!s.thinking) events.push(status(s.fighter, "Thinking"));
    s.thinking = true;
    s.reasoningChars += text.length;
    flush(s, tMs, events);
    return { state: s, events };
  }

  s.thinking = false;
  if (s.firstContentMs === null) {
    s.firstContentMs = tMs;
    s.windowStartMs = tMs;
    events.push(status(s.fighter, "Writing"));
  }
  s.lastContentMs = tMs;
  s.lastCircleMs = null;
  s.contentChars += text.length;

  const { milestone, headings } = scanLines(s, text);
  for (const h of headings) events.push(status(s.fighter, `Drafting: ${h}`));
  if (milestone?.pitch && !s.pitching) events.push(status(s.fighter, "Writing the pitch"));
  if (milestone?.pitch) s.pitching = true;
  if (!s.pitching) s.tail = (s.tail + text).slice(-T.snippetChars);

  const burst = burstMove(s, tMs);
  const action = milestone
    ? { move: "combo" as const, intensity: milestone.intensity }
    : burst;
  if (action) events.push({ kind: "action", fighter: s.fighter, ...action });

  flush(s, tMs, events);
  return { state: s, events };
}

export function step(state: MoveState, input: MoveInput): { state: MoveState; events: FightEvent[] } {
  switch (input.type) {
    case "delta":
      return onDelta(state, input);
    case "tick": {
      const s = { ...state };
      const events: FightEvent[] = [];
      checkGap(s, input.tMs, events);
      flush(s, input.tMs, events);
      return { state: s, events };
    }
    case "retry":
      return {
        state: { ...state, lastActivityMs: input.tMs },
        events: [status(state.fighter, "Retrying"), { kind: "action", fighter: state.fighter, move: "stagger", intensity: 1 }],
      };
    case "finished":
      return {
        state,
        events: [
          status(state.fighter, "Finished"),
          ...(input.first ? [{ kind: "action" as const, fighter: state.fighter, move: "taunt" as const, intensity: 1 }] : []),
        ],
      };
  }
}
