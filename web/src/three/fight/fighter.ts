// per-fighter style and condition, pure so the choreographer predicts with the same rules the director applies

export type Side = 0 | 1
export type Style = 'pressure' | 'counter' | 'outboxer'

export interface FighterProfile {
  style: Style
  /** scales move speed, ~0.9..1.12 */
  handSpeed: number
  /** 0..1, damage and stun per landed punch */
  power: number
  /** 0..1, raises the threshold for getting rocked */
  chin: number
  /** median read time in seconds; short because good fighters anticipate */
  reflex: number
  /** base aggression, 0..1 */
  workRate: number
  /** how often they showboat, 0..1 */
  showboat: number
}

export interface FighterState {
  stamina: number
  damage: number
  /** short-term accumulator from clean shots */
  stun: number
  /** fight seconds left rocked, 0 when fine */
  rocked: number
  /** -1..1, from recent landed versus eaten shots */
  momentum: number
  /** fight seconds left in a comeback burst */
  rally: number
  knockdowns: number
  lastActed: number
  /** feinted recently, slows the next read */
  feinted: number
  /** high blocks seen from the opponent, for adapting to the body */
  highBlocks: number
  /** fight seconds before they can be rocked again */
  cool: number
  rallies: number
}

const STYLE_BY_BRAND: Record<string, Style> = {
  anthropic: 'counter',
  openai: 'outboxer',
  google: 'outboxer',
  meta: 'pressure',
  mistral: 'pressure',
  nvidia: 'pressure',
  baidu: 'pressure',
  cohere: 'outboxer',
  poolside: 'counter',
  dots: 'counter',
  inclusionai: 'pressure',
  particle: 'outboxer',
  recursive: 'counter',
}

const TIER: Record<string, number> = { Flyweight: 0, Middleweight: 0.5, Heavyweight: 1 }

const hash = (s: string) => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return ((h >>> 0) % 1000) / 1000
}

/** deterministic per fighter: style from the brand, speed and reflex from the weight class and rating. */
export function profileFor(f: { brand: string; weightClass?: string; elo?: number; avgFinish?: number }): FighterProfile {
  const tier = TIER[f.weightClass ?? 'Middleweight'] ?? 0.5
  const skill = Math.min(1, Math.max(0, ((f.elo ?? 1500) - 1400) / 300))
  const h = hash(f.brand)
  const style = STYLE_BY_BRAND[f.brand] ?? (['pressure', 'counter', 'outboxer'] as const)[Math.floor(h * 3)]
  // flyweights are quick and light, heavyweights slower and harder hitting
  return {
    style,
    handSpeed: 1.08 - tier * 0.12 + skill * 0.05,
    power: 0.45 + tier * 0.35 + h * 0.1,
    chin: 0.4 + skill * 0.3 + (1 - h) * 0.2,
    reflex: 0.15 - skill * 0.04 - (style === 'counter' ? 0.02 : 0),
    workRate: Math.min(1, (style === 'pressure' ? 0.7 : style === 'outboxer' ? 0.55 : 0.45) + (f.avgFinish ? (60 - f.avgFinish) / 200 : 0)),
    showboat: 0.2 + h * 0.4,
  }
}

export const freshState = (): FighterState => ({
  stamina: 1,
  damage: 0,
  stun: 0,
  rocked: 0,
  momentum: 0,
  rally: 0,
  knockdowns: 0,
  lastActed: 0,
  feinted: 0,
  highBlocks: 0,
  cool: 0,
  rallies: 0,
})

export interface Landed {
  power: number
  clean: boolean
  target: 'head' | 'body'
  blocked: boolean
  knockdown?: boolean
}

/** rocked threshold: a better chin takes more, accumulated damage lowers it. */
export const rockLimit = (p: FighterProfile, s: FighterState) => 1 + p.chin * 0.5 - s.damage * 0.25

/** the defender's state after taking a punch; returns whether it rocked them. */
export function applyImpact(s: FighterState, p: FighterProfile, hit: Landed, attackerPower: number): { state: FighterState; rocked: boolean } {
  const n = { ...s }
  const force = hit.power * (0.6 + attackerPower * 0.6)
  if (hit.blocked) {
    n.damage = Math.min(1, n.damage + 0.008 * force)
    n.stamina = Math.max(0, n.stamina - 0.01)
    return { state: n, rocked: false }
  }
  const k = hit.clean ? 1 : 0.4
  // damage saturates, so long fights wear fighters down without pinning them at the floor
  n.damage = Math.min(1, n.damage + (1 - n.damage) * (hit.knockdown ? 0.2 : 0.04 * force * k))
  n.stun += force * k * (hit.target === 'head' ? 1 : 0.55) * (1 + n.damage)
  n.momentum = Math.max(-1, n.momentum - 0.25 * force * k)
  n.stamina = Math.max(0, n.stamina - (hit.target === 'body' ? 0.05 : 0.02) * k)
  if (hit.knockdown) n.knockdowns++
  const rocked = n.rocked <= 0 && n.cool <= 0 && n.stun > rockLimit(p, n)
  if (rocked) {
    n.rocked = 2.5 + (1 - p.chin) * 1.5
    n.cool = n.rocked + 12
    n.stun = 0.2
  }
  return { state: n, rocked }
}

/** the attacker's state after landing (or having blocked) a punch. */
export function creditAttacker(s: FighterState, power: number, clean: boolean, blocked: boolean): FighterState {
  return { ...s, momentum: Math.min(1, s.momentum + (blocked ? 0.02 : (clean ? 0.2 : 0.08) * power)), highBlocks: s.highBlocks + (blocked ? 1 : 0) }
}

/** passive recovery over dt fight seconds; busy fighters recover stamina slower. */
export function tickState(s: FighterState, dt: number, resting: boolean): FighterState {
  const n = { ...s }
  n.stamina = Math.min(1, n.stamina + dt * (resting ? 0.25 : 0.035))
  n.stun = Math.max(0, n.stun - dt * 0.5 * (1 - 0.4 * n.damage))
  n.rocked = Math.max(0, n.rocked - dt)
  n.rally = Math.max(0, n.rally - dt)
  n.feinted = Math.max(0, n.feinted - dt)
  n.cool = Math.max(0, n.cool - dt)
  n.momentum *= Math.exp(-dt * 0.08)
  return n
}
