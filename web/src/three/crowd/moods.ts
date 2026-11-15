// Spectator moods: the face drawn for each, how the arms and body move, and
// how a crowd member reacts to what happens in the ring.
import type { CrowdKind } from '../director'

export const Mood = {
  Neutral: 0,
  Cheer: 1,
  Angry: 2,
  Shocked: 3,
  Scream: 4,
  Wince: 5,
  Laugh: 6,
  Worried: 7,
  Bored: 8,
  Hyped: 9,
  Smirk: 10,
  Horrified: 11,
} as const
export type MoodId = (typeof Mood)[keyof typeof Mood]
export const MOOD_COUNT = 12

export interface MoodPose {
  /** Upper arm swing out to the side (0 hangs down, pi points straight up). */
  out: number
  /** Upper arm swing forward (negative is forward). */
  fwd: number
  /** Elbow bend (negative folds the forearm forward). */
  bend: number
  wave: number
  rate: number
  bounce: number
}

const REST: MoodPose = { out: 0.12, fwd: -0.2, bend: -0.9, wave: 0, rate: 0, bounce: 0 }
const FOLDED: MoodPose = { out: 0.08, fwd: -0.5, bend: -1.9, wave: 0, rate: 0, bounce: 0 }

export const POSES: Record<MoodId, MoodPose> = {
  [Mood.Neutral]: REST,
  [Mood.Cheer]: { out: 2.75, fwd: -0.1, bend: -0.2, wave: 0.5, rate: 7, bounce: 0.07 },
  [Mood.Angry]: { out: 1.7, fwd: -0.5, bend: -1.7, wave: 0.6, rate: 12, bounce: 0.02 },
  [Mood.Shocked]: { out: 1.4, fwd: -0.7, bend: -1.7, wave: 0.1, rate: 4, bounce: 0 },
  [Mood.Scream]: { out: 2.9, fwd: -0.2, bend: -0.1, wave: 0.6, rate: 11, bounce: 0.1 },
  [Mood.Wince]: { out: 0.9, fwd: -0.9, bend: -2.1, wave: 0.1, rate: 6, bounce: 0 },
  [Mood.Laugh]: { out: 0.5, fwd: -0.5, bend: -1.2, wave: 0.5, rate: 10, bounce: 0.05 },
  [Mood.Worried]: { out: 0.5, fwd: -0.9, bend: -2.2, wave: 0.05, rate: 3, bounce: 0 },
  [Mood.Bored]: FOLDED,
  [Mood.Hyped]: { out: 2.6, fwd: -0.3, bend: -0.5, wave: 0.7, rate: 9, bounce: 0.11 },
  [Mood.Smirk]: FOLDED,
  [Mood.Horrified]: { out: 2.0, fwd: -0.7, bend: -2.3, wave: 0.08, rate: 5, bounce: 0 },
}

type Weighted = [MoodId, number][]

export function pick(table: Weighted, r: number): MoodId {
  const total = table.reduce((a, [, w]) => a + w, 0)
  let x = r * total
  for (const [m, w] of table) if ((x -= w) < 0) return m
  return table[0][0]
}

/** Resting moods between reactions. */
export const IDLE: Weighted = [
  [Mood.Neutral, 34],
  [Mood.Bored, 16],
  [Mood.Smirk, 10],
  [Mood.Cheer, 14],
  [Mood.Worried, 8],
  [Mood.Hyped, 8],
  [Mood.Laugh, 6],
  [Mood.Angry, 4],
]

/** Calmer mix used while the fight is not running. */
export const IDLE_CALM: Weighted = [
  [Mood.Neutral, 42],
  [Mood.Bored, 22],
  [Mood.Smirk, 12],
  [Mood.Laugh, 10],
  [Mood.Cheer, 8],
  [Mood.Worried, 6],
]

/** Who a spectator backs: the red fighter, the blue one, or neither. */
export type Allegiance = 0 | 1 | 2

export interface Reaction {
  /** Chance a given spectator reacts at all. */
  odds: number
  /** Seconds the reaction is held, as min and spread. */
  hold: [number, number]
  mine: Weighted
  theirs: Weighted
  neutral: Weighted
}

export const REACTIONS: Record<CrowdKind, Reaction> = {
  hit: {
    odds: 0.85,
    hold: [1, 1],
    mine: [[Mood.Cheer, 40], [Mood.Hyped, 25], [Mood.Scream, 20], [Mood.Laugh, 15]],
    theirs: [[Mood.Wince, 35], [Mood.Shocked, 25], [Mood.Angry, 25], [Mood.Horrified, 15]],
    neutral: [[Mood.Shocked, 30], [Mood.Wince, 30], [Mood.Scream, 20], [Mood.Hyped, 20]],
  },
  knockdown: {
    odds: 1,
    hold: [2, 1.5],
    mine: [[Mood.Scream, 35], [Mood.Hyped, 35], [Mood.Cheer, 30]],
    theirs: [[Mood.Horrified, 45], [Mood.Shocked, 30], [Mood.Angry, 25]],
    neutral: [[Mood.Shocked, 40], [Mood.Scream, 30], [Mood.Horrified, 30]],
  },
  block: {
    odds: 0.5,
    hold: [0.7, 0.8],
    mine: [[Mood.Worried, 40], [Mood.Angry, 30], [Mood.Bored, 30]],
    theirs: [[Mood.Smirk, 50], [Mood.Cheer, 30], [Mood.Hyped, 20]],
    neutral: [[Mood.Shocked, 40], [Mood.Worried, 30], [Mood.Neutral, 30]],
  },
  slip: {
    odds: 0.6,
    hold: [0.8, 0.8],
    mine: [[Mood.Wince, 40], [Mood.Shocked, 30], [Mood.Angry, 30]],
    theirs: [[Mood.Hyped, 40], [Mood.Cheer, 30], [Mood.Laugh, 30]],
    neutral: [[Mood.Shocked, 50], [Mood.Laugh, 30], [Mood.Worried, 20]],
  },
  duck: {
    odds: 0.6,
    hold: [0.8, 0.8],
    mine: [[Mood.Wince, 40], [Mood.Shocked, 30], [Mood.Angry, 30]],
    theirs: [[Mood.Hyped, 40], [Mood.Cheer, 30], [Mood.Laugh, 30]],
    neutral: [[Mood.Shocked, 50], [Mood.Laugh, 30], [Mood.Worried, 20]],
  },
  taunt: {
    odds: 0.6,
    hold: [1.2, 1],
    mine: [[Mood.Laugh, 40], [Mood.Cheer, 40], [Mood.Smirk, 20]],
    theirs: [[Mood.Angry, 70], [Mood.Shocked, 30]],
    neutral: [[Mood.Laugh, 50], [Mood.Shocked, 25], [Mood.Hyped, 25]],
  },
}

/** The bell: the whole building erupts. */
export const ROAR: Reaction = {
  odds: 1,
  hold: [2, 1.5],
  mine: [[Mood.Scream, 40], [Mood.Cheer, 35], [Mood.Hyped, 25]],
  theirs: [[Mood.Scream, 40], [Mood.Cheer, 35], [Mood.Hyped, 25]],
  neutral: [[Mood.Scream, 40], [Mood.Cheer, 35], [Mood.Hyped, 25]],
}

/** End of a round: applause, relief, and a few unimpressed faces. */
export const APPLAUSE: Reaction = {
  odds: 0.9,
  hold: [2.5, 2],
  mine: [[Mood.Cheer, 40], [Mood.Hyped, 25], [Mood.Laugh, 15], [Mood.Bored, 20]],
  theirs: [[Mood.Cheer, 40], [Mood.Hyped, 25], [Mood.Laugh, 15], [Mood.Bored, 20]],
  neutral: [[Mood.Cheer, 40], [Mood.Hyped, 25], [Mood.Laugh, 15], [Mood.Bored, 20]],
}

const BIG: Record<CrowdKind, Weighted> = {
  hit: [[Mood.Scream, 40], [Mood.Shocked, 30], [Mood.Hyped, 30]],
  knockdown: [[Mood.Horrified, 40], [Mood.Scream, 40], [Mood.Shocked, 20]],
  block: [[Mood.Shocked, 50], [Mood.Hyped, 30], [Mood.Worried, 20]],
  slip: [[Mood.Shocked, 45], [Mood.Laugh, 30], [Mood.Hyped, 25]],
  duck: [[Mood.Shocked, 45], [Mood.Laugh, 30], [Mood.Hyped, 25]],
  taunt: [[Mood.Laugh, 50], [Mood.Shocked, 30], [Mood.Hyped, 20]],
}

/** Commentators never sit out and hold every reaction longer than the crowd. */
function exaggerate(r: Reaction, table: Weighted): Reaction {
  return { odds: 1, hold: [r.hold[0] * 1.5, r.hold[1] * 1.5], mine: table, theirs: table, neutral: table }
}

export const HOST_REACTIONS = Object.fromEntries(
  (Object.keys(REACTIONS) as CrowdKind[]).map((k) => [k, exaggerate(REACTIONS[k], BIG[k])]),
) as Record<CrowdKind, Reaction>
export const HOST_ROAR = exaggerate(ROAR, [[Mood.Scream, 60], [Mood.Hyped, 40]])
export const HOST_APPLAUSE = exaggerate(APPLAUSE, [[Mood.Hyped, 50], [Mood.Cheer, 30], [Mood.Laugh, 20]])

export const HOST_IDLE: Weighted = [
  [Mood.Hyped, 25],
  [Mood.Shocked, 20],
  [Mood.Cheer, 15],
  [Mood.Worried, 15],
  [Mood.Angry, 10],
  [Mood.Scream, 10],
  [Mood.Laugh, 5],
]

export const HOST_IDLE_CALM: Weighted = [
  [Mood.Neutral, 40],
  [Mood.Smirk, 20],
  [Mood.Laugh, 15],
  [Mood.Cheer, 10],
  [Mood.Worried, 10],
  [Mood.Shocked, 5],
]

/** Face shown on the rare moment a commentator turns to the camera. */
export const HOST_LOOK: Weighted = [
  [Mood.Smirk, 40],
  [Mood.Laugh, 35],
  [Mood.Cheer, 25],
]
