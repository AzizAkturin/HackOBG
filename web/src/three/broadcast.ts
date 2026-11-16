import type { MatchFighter } from '../data/fighters'

/** Live match data the arena's screens draw from. Mutated in place like FightSignals; screens redraw when version moves. */
export interface Broadcast {
  version: number
  fighters: MatchFighter[]
  task: string
  matchLabel: string
  weightClass: string
  round: string
  texts: [string, string]
  tokens: [number, number]
  budget: number
  finished: [boolean, boolean]
  wins: [number, number]
  priceA: number
  fightSeconds: number
}

export type BroadcastData = Omit<Broadcast, 'version'>

export const createBroadcast = (fighters: MatchFighter[]): Broadcast => ({
  version: 0,
  fighters,
  task: '',
  matchLabel: '',
  weightClass: '',
  round: '',
  texts: ['', ''],
  tokens: [0, 0],
  budget: 0,
  finished: [false, false],
  wins: [0, 0],
  priceA: 0.5,
  fightSeconds: 0,
})

const same = (a: unknown, b: unknown): boolean => a === b || (Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => same(v, b[i])))

export function updateBroadcast(b: Broadcast, next: BroadcastData) {
  const changed = (Object.keys(next) as (keyof BroadcastData)[]).some((k) => !same(b[k], next[k]))
  if (!changed) return
  Object.assign(b, next)
  b.version++
}
