export type Move = "approach" | "jab" | "combo" | "dodge" | "circle" | "stagger" | "taunt" | "knockdown";

export type FightEvent =
  | { kind: "phase"; phase: "open" | "fighting" | "pitching" | "voting" | "settled" | "cancelled"; endsAt?: number }
  | { kind: "progress"; fighter: number; tokens: number; budget: number }
  | { kind: "action"; fighter: number; move: Move; intensity: number }
  | { kind: "snippet"; fighter: number; text: string }
  | { kind: "status"; fighter: number; text: string }
  | { kind: "ko"; fighter: number; reason: string }
  | { kind: "finished"; fighter: number; atMs: number }
  | { kind: "pitches"; pitches: { label: string; text: string; result: string }[] }
  | { kind: "reveal"; labelToFighter: number[]; votes: number[]; judgeRank: number[]; winner: number };

export type EventEnvelope = { roundId: number; seq: number; tMs: number; event: FightEvent };
