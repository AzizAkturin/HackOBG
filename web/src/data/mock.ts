// Placeholder data until the API and chain reads exist.

export type WeightClass = 'Flyweight' | 'Middleweight' | 'Heavyweight'

export interface Fighter {
  id: number
  name: string
  nickname: string
  record: [wins: number, losses: number]
  elo: number
  accent: string
  skin: string
  hair: string
  /** current win (+) or loss (-) streak */
  streak: number
  /** average seconds to finish a task */
  avgFinish: number
  /** average share of crowd votes their pitches receive */
  voteShare: number
  modelTier: string
  /** starting pool on this fighter, MON */
  pool: number
  backers: number
}

export const RAKE = 0.05

export const classLimits: Record<WeightClass, { min: number; max: number }> = {
  Flyweight: { min: 0.01, max: 0.1 },
  Middleweight: { min: 0.05, max: 0.5 },
  Heavyweight: { min: 0.2, max: 2 },
}

export const classColor: Record<WeightClass, string> = {
  Flyweight: '#5cff9d',
  Middleweight: '#4da3ff',
  Heavyweight: '#ff4d4d',
}

export const mainEvent = {
  roundId: 42,
  weightClass: 'Middleweight' as WeightClass,
  arena: 'The Boiler Room',
  task: 'Pitch a startup that makes laundromats profitable again.',
  locksInSec: 90,
  watching: 1284,
  fighters: [
    { id: 7, name: 'Rex Okafor', nickname: 'The Compiler', record: [12, 5], elo: 1540, accent: '#ff4d4d', skin: '#8d5a3b', hair: '#1b1220', streak: 2, avgFinish: 48, voteShare: 0.54, modelTier: 'Mid · low reasoning', pool: 6.1, backers: 14 },
    { id: 3, name: 'Vesper Hale', nickname: 'Quiet Storm', record: [15, 3], elo: 1612, accent: '#4da3ff', skin: '#f1c9a5', hair: '#e8e2f7', streak: 4, avgFinish: 71, voteShare: 0.61, modelTier: 'Mid · low reasoning', pool: 7.4, backers: 16 },
  ] satisfies Fighter[],
}

export type FightStatus = 'fighting' | 'voting' | 'upcoming'

export const otherFights: {
  roundId: number
  weightClass: WeightClass
  task: string
  fighters: number
  status: FightStatus
  /** seconds until start, for upcoming fights */
  startsInSec?: number
}[] = [
  { roundId: 41, weightClass: 'Heavyweight', task: 'Design a city with no cars. Defend it.', fighters: 2, status: 'fighting' },
  { roundId: 40, weightClass: 'Flyweight', task: 'Riddle: what has keys but opens no locks?', fighters: 2, status: 'voting' },
  { roundId: 43, weightClass: 'Flyweight', task: 'Write a haiku about a cat who trades crypto.', fighters: 2, status: 'upcoming', startsInSec: 200 },
  { roundId: 44, weightClass: 'Heavyweight', task: 'Plan a heist using only spreadsheets.', fighters: 2, status: 'upcoming', startsInSec: 465 },
  { roundId: 45, weightClass: 'Middleweight', task: 'Custom: "Roast my landing page in 50 words."', fighters: 2, status: 'upcoming', startsInSec: 780 },
]

export const leaderboard = [
  { rank: 1, name: 'Vesper Hale', weightClass: 'MW', record: '15-3', elo: 1612, accent: '#4da3ff' },
  { rank: 2, name: 'Rex Okafor', weightClass: 'MW', record: '12-5', elo: 1540, accent: '#ff4d4d' },
  { rank: 3, name: 'Ilya Brandt', weightClass: 'HW', record: '9-4', elo: 1533, accent: '#c58bff' },
  { rank: 4, name: 'Lina Sato', weightClass: 'MW', record: '10-6', elo: 1498, accent: '#5cff9d' },
  { rank: 5, name: 'Pip Calder', weightClass: 'FW', record: '14-11', elo: 1487, accent: '#ffcf4a' },
]

export const crowdAmounts = [0.05, 0.05, 0.1, 0.1, 0.15, 0.2, 0.25, 0.5]

export function randomAddress() {
  const hex = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0')
  return `0x${hex()}…${hex().slice(0, 2)}`
}

export function formatClock(sec: number) {
  const s = Math.max(0, sec)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export const firstName = (name: string) => name.split(' ')[0]
