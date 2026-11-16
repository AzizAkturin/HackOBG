// Placeholder data until the API and chain reads exist.

import { brands, type BrandKey } from './brands'

export type WeightClass = 'Flyweight' | 'Middleweight' | 'Heavyweight'

export interface Fighter {
  id: number
  name: string
  record: [wins: number, losses: number]
  elo: number
  brand: BrandKey
  /** model tier; sets the robot's firmware */
  weightClass: WeightClass
  /** UI text colour, taken from the brand */
  accent: string
  /** current win (+) or loss (-) streak */
  streak: number
  /** average seconds to finish a task */
  avgFinish: number
  /** average share of crowd votes their pitches receive */
  voteShare: number
  model: string
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
  Flyweight: '#1a9b57',
  Middleweight: '#1a5fd0',
  Heavyweight: '#d00',
}

export type Output = { kind: 'text'; text: string } | { kind: 'image'; src: string; alt: string }

const svg = (body: string) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'>${body}</svg>`)}`

const textDemo = {
  task: 'Pitch a startup that makes laundromats profitable again.',
  outputs: [
    {
      kind: 'text',
      text: `SpinCycle turns idle laundromats into neighborhood micro-fulfillment hubs.

Most laundromats sit 70% empty outside weekend peaks. We install smart lockers and a scheduling app so local shops, dry cleaners and online sellers can rent drop-off space by the hour, while the machines run wash-and-fold orders overnight.

Revenue: locker rentals ($4 per pickup), a 15% cut of wash-and-fold, and a SaaS fee for owners at $199 a month. A typical 40-machine store adds about $6,800 in monthly revenue with no new floor space.

Go to market: start with 20 stores in Queens, where density is high and owners already know each other. Expand through franchise groups once we have unit economics from the first cohort.`,
    },
    {
      kind: 'text',
      text: `Laundromats don't have a demand problem. They have a dead-time problem.

Fold & Co. sells the wait. Customers spend 90 minutes in a store with nothing to do, so we turn that time into a membership: coffee bar, fast Wi-Fi, bookable work booths and a kids' corner, for $12 a month.

Members get 10% off every load and a guaranteed machine at peak hours. Owners keep the wash revenue and split membership fees with us 60/40.

Our pilot store in Austin reached 410 members in 8 weeks, and weekday traffic rose 38%. The plan is a white-label kit (furniture, POS, app) that converts a store in one weekend.`,
    },
  ] as Output[],
}

const imageDemo = {
  task: 'Design a logo for a 24-hour laundromat called "Night Shift".',
  outputs: [
    {
      kind: 'image',
      alt: 'A crescent moon inside a washing machine door, on a navy background, with the words Night Shift below',
      src: svg(`<rect width='512' height='512' fill='#0d1b3d'/><circle cx='256' cy='220' r='130' fill='none' stroke='#c9d6ff' stroke-width='18'/><circle cx='256' cy='220' r='96' fill='#18306b'/><path d='M290 160a70 70 0 1 0 0 120a56 56 0 1 1 0-120z' fill='#ffd76a'/><text x='256' y='430' text-anchor='middle' font-family='Arial Black,Arial' font-size='56' fill='#c9d6ff' letter-spacing='4'>NIGHT SHIFT</text>`),
    },
    {
      kind: 'image',
      alt: 'A neon pink sign style wordmark reading Night Shift with a sock hanging from the letter T, on a black background',
      src: svg(`<rect width='512' height='512' fill='#0a0a0a'/><text x='256' y='230' text-anchor='middle' font-family='Brush Script MT,cursive' font-size='112' fill='none' stroke='#ff4fb8' stroke-width='5'>Night</text><text x='256' y='340' text-anchor='middle' font-family='Brush Script MT,cursive' font-size='112' fill='none' stroke='#4ff0ff' stroke-width='5'>Shift</text><path d='M392 340v50q0 18 18 18h22v-24h-16v-44z' fill='#ff4fb8'/><text x='256' y='450' text-anchor='middle' font-family='Arial' font-size='26' fill='#888' letter-spacing='10'>OPEN 24 HOURS</text>`),
    },
  ] as Output[],
}

// mock only: add ?image to the URL to preview an image round
const demo = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('image') ? imageDemo : textDemo

export const mainEvent = {
  roundId: 42,
  weightClass: 'Middleweight' as WeightClass,
  task: demo.task,
  outputs: demo.outputs,
  /** judge's ranking by fighter index, breaks vote ties */
  judgeRank: [1, 0],
  locksInSec: 90,
  watching: 1284,
  fighters: [
    { id: 7, name: 'Particle Pacquiao', record: [12, 5], elo: 1540, brand: 'particle', weightClass: 'Middleweight', accent: brands.particle.ink, streak: 2, avgFinish: 48, voteShare: 0.54, model: 'Particle 1', pool: 6.1, backers: 14 },
    { id: 3, name: 'Dotty Pimblett', record: [15, 3], elo: 1612, brand: 'dots', weightClass: 'Middleweight', accent: brands.dots.ink, streak: 4, avgFinish: 71, voteShare: 0.61, model: 'dots Note', pool: 7.4, backers: 16 },
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

const roster: { name: string; brand: BrandKey; weightClass: WeightClass; record: [number, number]; elo: number }[] = [
  { name: 'Dotty Pimblett', brand: 'dots', weightClass: 'Middleweight', record: [15, 3], elo: 1612 },
  { name: 'Particle Pacquiao', brand: 'particle', weightClass: 'Middleweight', record: [12, 5], elo: 1540 },
  { name: 'Gemma Shevchenko', brand: 'google', weightClass: 'Heavyweight', record: [9, 4], elo: 1533 },
  { name: "Sean O'Mistral", brand: 'mistral', weightClass: 'Middleweight', record: [10, 6], elo: 1498 },
  { name: 'Francis Lagunnou', brand: 'poolside', weightClass: 'Flyweight', record: [14, 11], elo: 1487 },
  { name: 'Claude Pereira', brand: 'anthropic', weightClass: 'Heavyweight', record: [11, 4], elo: 1471 },
  { name: 'Georges St-GPT', brand: 'openai', weightClass: 'Heavyweight', record: [13, 7], elo: 1455 },
  { name: 'Conor McLlama', brand: 'meta', weightClass: 'Middleweight', record: [8, 5], elo: 1442 },
  { name: 'Nate Nemotron', brand: 'nvidia', weightClass: 'Middleweight', record: [9, 8], elo: 1420 },
  { name: 'Ernie Edwards', brand: 'baidu', weightClass: 'Flyweight', record: [7, 6], elo: 1401 },
  { name: 'Terence North', brand: 'cohere', weightClass: 'Flyweight', record: [6, 7], elo: 1388 },
  { name: 'Ling Weili', brand: 'inclusionai', weightClass: 'Flyweight', record: [5, 6], elo: 1360 },
  { name: 'Flint Mayweather', brand: 'recursive', weightClass: 'Flyweight', record: [4, 8], elo: 1335 },
]

const classAbbr: Record<WeightClass, string> = { Flyweight: 'FW', Middleweight: 'MW', Heavyweight: 'HW' }

export const leaderboard = [...roster]
  .sort((a, b) => b.elo - a.elo)
  .slice(0, 5)
  .map((f, i) => ({
    rank: i + 1,
    name: f.name,
    weightClass: classAbbr[f.weightClass],
    record: `${f.record[0]}-${f.record[1]}`,
    elo: f.elo,
    accent: brands[f.brand].ink,
  }))

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

export const roundLabel = (id: number) => `R${String(id).padStart(3, '0')}`
