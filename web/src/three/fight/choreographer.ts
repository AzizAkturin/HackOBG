// plans whole exchanges up front (reads, counters, trades, rocked fighters, knockdowns); pure and seeded
import type { MoveIntent } from '../footwork.ts'
import { MOVES, moveTiming, rollVariation, type HitKind, type MoveName, type RangeBand, type Variation } from '../moves.ts'
import { applyImpact, creditAttacker, type FighterProfile, type FighterState, type Side, type Style } from './fighter.ts'
import type { Rhythm } from './rhythm.ts'
import type { Rng } from './rng.ts'

export type Reaction = 'block' | 'slip' | 'duck' | 'hit' | 'knockdown'
export type Note = 'counter' | 'trade' | 'rocked' | 'knee' | 'return' | 'feint'
export type Weight = 'light' | 'combo' | 'power'

export type Beat =
  | { at: number; kind: 'move'; who: Side; move: MoveName; v: Variation; mirror: boolean }
  | { at: number; kind: 'impact'; who: Side; move: MoveName; reaction: Reaction; power: number; clean: boolean; rocked: boolean; note?: Note }
  | { at: number; kind: 'range'; who: Side; intent: MoveIntent; urgency: number; dur: number }
  | { at: number; kind: 'feinted'; who: Side }

export interface Plan {
  beats: Beat[]
  end: number
  notes: Note[]
}

export type Intent =
  | { kind: 'attack'; who: Side; weight: Weight; force?: Reaction }
  | { kind: 'trade' }
  | { kind: 'feint'; who: Side }
  | { kind: 'reset'; who: Side }
  | { kind: 'showboat'; who: Side }

export interface Ctx {
  t: number
  /** round progress 0..1 */
  p: number
  fighters: [FighterState, FighterState]
  profiles: [FighterProfile, FighterProfile]
  rhythm: Rhythm
  band: RangeBand
  trapped: [boolean, boolean]
  backroom: [number, number]
  /** live effort per model, 0..1.5, 0.5 when unknown */
  work: [number, number]
  busy: [boolean, boolean]
}

interface Combo {
  moves: MoveName[]
  weight: Weight
  w: number
  body?: boolean
}

const CATALOG: Combo[] = [
  { moves: ['jab'], weight: 'light', w: 3 },
  { moves: ['jab', 'jab'], weight: 'light', w: 1.2 },
  { moves: ['cross'], weight: 'light', w: 1.5 },
  { moves: ['body'], weight: 'light', w: 0.8, body: true },
  { moves: ['jab', 'cross'], weight: 'combo', w: 3 },
  { moves: ['jab', 'cross', 'hook'], weight: 'combo', w: 2 },
  { moves: ['cross', 'hook', 'cross'], weight: 'combo', w: 1 },
  { moves: ['jab', 'body', 'uppercut'], weight: 'combo', w: 1, body: true },
  { moves: ['body', 'hook'], weight: 'combo', w: 1.2, body: true },
  { moves: ['jab', 'jab', 'cross'], weight: 'combo', w: 1 },
  { moves: ['hook', 'uppercut'], weight: 'power', w: 1.5 },
  { moves: ['overhand'], weight: 'power', w: 1.2 },
  { moves: ['uppercut', 'hook'], weight: 'power', w: 1 },
  { moves: ['jab', 'cross', 'hook', 'uppercut'], weight: 'power', w: 0.8 },
  { moves: ['body', 'body', 'hook'], weight: 'power', w: 0.8, body: true },
]

const STYLE_TASTE: Record<Style, (c: Combo) => number> = {
  pressure: (c) => (c.body ? 1.6 : 1) * (c.moves.length > 1 ? 1.3 : 0.8),
  counter: (c) => (c.moves.length === 1 ? 1.6 : 0.8),
  outboxer: (c) => (c.moves.every((m) => m === 'jab' || m === 'cross') ? 1.8 : 0.7),
}

const EVADE: Record<Style, number> = { counter: 0.7, outboxer: 0.6, pressure: 0.35 }
const COUNTER: Record<Style, number> = { counter: 0.55, outboxer: 0.25, pressure: 0.2 }
const RETURN: Record<Style, number> = { counter: 0.35, outboxer: 0.2, pressure: 0.25 }
/** how long before impact each defence must start to work */
const LEAD: Record<string, number> = { slip: 0.07, duck: 0.09, stepBack: 0.12, block: 0.04 }

const other = (s: Side) => (1 - s) as Side

function pickCombo(ctx: Ctx, who: Side, weight: Weight, rng: Rng): MoveName[] {
  const prof = ctx.profiles[who]
  const opp = ctx.fighters[other(who)]
  const me = ctx.fighters[who]
  const options = CATALOG.filter((c) => c.weight === weight).map((c) => {
    let w = c.w * STYLE_TASTE[prof.style](c)
    // a punch that does not suit the range is rare, not impossible
    const fits = c.moves.every((m) => !MOVES[m].range || MOVES[m].range!.includes(ctx.band) || ctx.band === 'outside')
    if (!fits) w *= 0.2
    if (c.body && me.highBlocks > 3) w *= 2
    if (c.moves.length > 2 && me.stamina < 0.35) w *= 0.4
    if (opp.rocked > 0 && c.weight !== 'light') w *= 1.5
    return [c.moves, w] as const
  })
  return rng.pick(options)
}

/** utility per fighter for taking the initiative. */
function initiative(ctx: Ctx, i: Side): number {
  const s = ctx.fighters[i]
  const o = ctx.fighters[other(i)]
  const p = ctx.profiles[i]
  if (ctx.busy[i]) return -Infinity
  const mode = ctx.rhythm.mode
  const styleMode = p.style === 'pressure' ? (mode === 'flurry' || mode === 'swarm' ? 1.25 : 1.05) : p.style === 'counter' ? 0.9 : 1
  return (
    p.workRate * styleMode +
    0.2 * s.momentum +
    0.3 * s.stamina -
    (s.rocked > 0 ? 0.8 : 0) +
    (o.rocked > 0 ? 1 : 0) +
    Math.min(0.9, (ctx.t - s.lastActed) * 0.25) +
    (s.rally > 0 ? 0.6 : 0) +
    0.5 * (ctx.work[i] - 0.5)
  )
}

/** who does what next, when nothing external is driving the fight. */
export function decide(ctx: Ctx, rng: Rng): Intent {
  const u = [initiative(ctx, 0), initiative(ctx, 1)]
  const mode = ctx.rhythm.mode
  const close = ctx.band === 'punching' || ctx.band === 'inside'
  const opts: [Intent, number][] = []
  for (const i of [0, 1] as Side[]) if (u[i] > -Infinity) opts.push([{ kind: 'attack', who: i, weight: 'light' }, Math.exp(u[i] / 0.35)])
  const both = Math.min(u[0], u[1])
  if (close && both > 0.6 && (mode === 'flurry' || mode === 'work')) opts.push([{ kind: 'trade' }, Math.exp(both / 0.35) * (mode === 'flurry' ? 0.35 : 0.12)])
  const quiet = mode === 'lull' || mode === 'feel' || mode === 'recover' ? 2.5 : 0.25
  for (const i of [0, 1] as Side[]) {
    if (ctx.busy[i]) continue
    const s = ctx.fighters[i]
    const p = ctx.profiles[i]
    opts.push([{ kind: 'reset', who: i }, quiet])
    opts.push([{ kind: 'feint', who: i }, 0.25 + (p.style === 'outboxer' ? 0.25 : 0)])
    if (s.momentum > 0.3 && ctx.fighters[other(i)].rocked <= 0) opts.push([{ kind: 'showboat', who: i }, p.showboat * 0.25])
  }
  if (!opts.length) return { kind: 'reset', who: 0 }
  const intent = rng.pick(opts)
  if (intent.kind !== 'attack') return intent
  return { ...intent, weight: weightFor(ctx, intent.who, rng) }
}

export function weightFor(ctx: Ctx, who: Side, rng: Rng): Weight {
  const s = ctx.fighters[who]
  const opp = ctx.fighters[other(who)]
  const heat = ctx.rhythm.intensity
  if (opp.rocked > 0) return rng.chance(0.65) ? 'power' : 'combo'
  return rng.pick<Weight>([
    ['light', 1.4 - heat],
    ['combo', 0.4 + heat * s.stamina],
    ['power', (0.1 + heat * 0.4) * s.stamina * (0.5 + ctx.p)],
  ])
}

/** plans one exchange; the result never changes once made. */
export function choreograph(ctx: Ctx, intent: Intent, rng: Rng): Plan {
  const plan: Plan = { beats: [], end: ctx.t, notes: [] }
  const sim: [FighterState, FighterState] = [{ ...ctx.fighters[0] }, { ...ctx.fighters[1] }]
  const p = new Planner(ctx, rng, plan, sim)
  switch (intent.kind) {
    case 'attack':
      p.attack(intent.who, pickCombo(ctx, intent.who, intent.weight, rng), ctx.t, intent.force)
      break
    case 'trade':
      p.trade(ctx.t)
      break
    case 'feint':
      p.feint(intent.who, ctx.t)
      break
    case 'reset':
      p.reset(intent.who, ctx.t)
      break
    case 'showboat':
      p.move(intent.who, 'taunt', ctx.t)
      plan.end = ctx.t + 1.6
      break
  }
  plan.beats.sort((a, b) => a.at - b.at)
  return plan
}

class Planner {
  private kneeled = false
  private ctx: Ctx
  private rng: Rng
  private plan: Plan
  private sim: [FighterState, FighterState]
  constructor(ctx: Ctx, rng: Rng, plan: Plan, sim: [FighterState, FighterState]) {
    this.ctx = ctx
    this.rng = rng
    this.plan = plan
    this.sim = sim
  }

  private vary(who: Side): Variation {
    const s = this.sim[who]
    const p = this.ctx.profiles[who]
    return rollVariation(this.rng.next, {
      tempo: p.handSpeed * (0.85 + 0.15 * s.stamina) * (s.rally > 0 ? 1.08 : 1),
      power: 0.9 + p.power * 0.2,
      sloppy: (1 - s.stamina) * 0.6 + s.damage * 0.4,
    })
  }

  move(who: Side, move: MoveName, at: number, v = this.vary(who), mirror = false) {
    this.plan.beats.push({ at, kind: 'move', who, move, v, mirror })
    this.plan.end = Math.max(this.plan.end, at + moveTiming(move, v).dur)
  }

  private range(who: Side, intent: MoveIntent, at: number, urgency: number, dur: number) {
    this.plan.beats.push({ at, kind: 'range', who, intent, urgency, dur })
  }

  private reactionTime(who: Side, depth: number): number {
    const s = this.sim[who]
    const p = this.ctx.profiles[who]
    const edge = Math.max(-0.08, Math.min(0.08, (this.ctx.work[other(who)] - this.ctx.work[who]) * 0.12))
    const median = p.reflex * (1 + (1 - s.stamina) * 0.4) * (1 + s.damage * 0.3) * (s.rocked > 0 ? 2 : 1) * (1 + 0.18 * depth) * (s.feinted > 0 ? 1.3 : 1) * (s.rally > 0 ? 0.87 : 1) * (1 + edge)
    return this.rng.logNormal(median, 0.35)
  }

  private evasion(defender: Side, kind: HitKind): MoveName | null {
    const style = this.ctx.profiles[defender].style
    if (style === 'outboxer' && !this.ctx.trapped[defender] && this.ctx.backroom[defender] > 0.8 && this.rng.chance(0.35)) return 'stepBack'
    if (kind === 'straight') return 'slip'
    if (kind === 'hook' || kind === 'overhand') return 'duck'
    return null
  }

  private land(attacker: Side, move: MoveName, at: number, reaction: Reaction, clean: boolean, v: Variation, note?: Note): boolean {
    const d = other(attacker)
    const hit = MOVES[move].hit!
    const power = hit.power * v.power
    const blocked = reaction !== 'hit' && reaction !== 'knockdown'
    let rocked = false
    if (reaction !== 'slip' && reaction !== 'duck') {
      const r = applyImpact(this.sim[d], this.ctx.profiles[d], { power, clean, target: hit.target, blocked, knockdown: reaction === 'knockdown' }, this.ctx.profiles[attacker].power)
      this.sim[d] = r.state
      rocked = r.rocked
      this.sim[attacker] = creditAttacker(this.sim[attacker], power, clean, blocked)
    }
    this.plan.beats.push({ at, kind: 'impact', who: attacker, move, reaction, power, clean, rocked, note })
    if (note) this.plan.notes.push(note)
    if (rocked) this.plan.notes.push('rocked')
    return rocked
  }

  /** a combo from attacker; force fixes the outcome of every punch (live stagger, dev keys) */
  attack(a: Side, combo: MoveName[], t: number, force?: Reaction) {
    const d = other(a)
    const { band } = this.ctx
    let at = t
    if (band === 'outside' || band === 'far') {
      this.range(a, { kind: 'press' }, t, 1, 1.2)
      this.move(a, 'stepIn', t)
      at = t + 0.3
    } else this.range(a, { kind: 'press', range: 1.9 }, t, 0.6, 1)
    const dstyle = this.ctx.profiles[d].style
    if (this.sim[d].rocked > 0) this.range(d, this.ctx.trapped[d] ? { kind: 'clinch' } : { kind: 'retreat' }, t, 0.7, 1.5)
    else if (dstyle === 'outboxer' && this.rng.chance(0.4)) this.range(d, { kind: 'retreat' }, t, 0.4, 0.8)

    let lastHit = at
    let lastReaction: Reaction = 'block'
    for (let k = 0; k < combo.length; k++) {
      const move = combo[k]
      const def = MOVES[move]
      const hit = def.hit!
      const v = this.vary(a)
      const tm = moveTiming(move, v)
      const hitAt = at + tm.hitAt!
      const mirror = !!def.mirror && this.rng.chance(0.3)
      this.move(a, move, at, v, mirror)

      const seen = at + (def.tell ?? 0.2) * def.dur * v.windup + this.reactionTime(d, k)
      const slack = hitAt - seen
      const rocked = this.sim[d].rocked > 0
      const evade = rocked ? null : this.evasion(d, hit.kind)
      let reaction: Reaction
      let clean = true
      if (force) reaction = force
      else if (evade && slack > LEAD[evade] && this.rng.chance(EVADE[dstyle])) reaction = evade === 'duck' ? 'duck' : 'slip'
      else if (slack > LEAD.block) reaction = 'block'
      else if (slack > 0) {
        reaction = 'hit'
        clean = false
      } else reaction = 'hit'

      if (reaction === 'hit' && clean && rocked && hit.power >= 0.6 && this.ctx.p >= 0.2 && this.sim[d].knockdowns < 1 && this.rng.chance(0.4)) reaction = 'knockdown'

      if (reaction === 'block') this.move(d, rocked || (k > 0 && this.rng.chance(0.3)) ? 'coverUp' : 'block', Math.max(t, seen - 0.02))
      else if (reaction === 'slip' || reaction === 'duck') this.move(d, evade === 'stepBack' ? 'stepBack' : reaction, Math.max(t, seen), undefined, this.rng.chance(0.5))
      else if (reaction === 'knockdown') this.move(d, 'knockdown', hitAt)
      else if (clean && rocked && !this.kneeled && this.rng.chance(0.2)) {
        this.kneeled = true
        this.move(d, 'kneel', hitAt)
        this.plan.notes.push('knee')
      } else this.move(d, hit.target === 'body' ? 'bodyFold' : 'stagger', hitAt, undefined, this.rng.chance(0.5))

      this.land(a, move, hitAt, reaction, clean, v)
      lastHit = hitAt
      lastReaction = reaction

      if (reaction === 'knockdown') {
        const corner: [number, number] = a === 0 ? [-2.6, -2.6] : [2.6, 2.6]
        this.range(d, { kind: 'locked' }, hitAt, 0, moveTiming('knockdown').dur)
        this.range(a, { kind: 'goto', x: corner[0], z: corner[1], face: 'opp' }, hitAt + 0.4, 0.6, 2.4)
        this.move(a, 'taunt', hitAt + 0.9)
        this.range(a, { kind: 'center' }, hitAt + 3.2, 0.5, 0.6)
        this.plan.end = Math.max(this.plan.end, hitAt + moveTiming('knockdown').dur + 0.3)
        return
      }

      // a clean slip or duck opens the counter, and the rest of the combo never comes
      if (!force && (reaction === 'slip' || reaction === 'duck') && slack - LEAD[evade ?? 'slip'] > 0.02 && this.rng.chance(COUNTER[dstyle] + this.sim[d].momentum * 0.2)) {
        this.counter(d, reaction, hitAt + 0.04, at + tm.recoverAt)
        return
      }
      at = hitAt + this.rng.range(0.05, 0.14) / this.ctx.profiles[a].handSpeed
    }

    if (!force && lastReaction === 'block' && this.rng.chance(RETURN[dstyle])) {
      const move: MoveName = this.rng.chance(0.6) ? 'cross' : 'hook'
      const v = this.vary(d)
      const start = lastHit + 0.12
      const hitAt = start + moveTiming(move, v).hitAt!
      this.move(d, move, start, v, !!MOVES[move].mirror && this.rng.chance(0.5))
      const seen = start + 0.15 + this.reactionTime(a, 1)
      const reaction: Reaction = hitAt - seen > LEAD.block ? 'block' : 'hit'
      this.move(a, reaction === 'block' ? 'block' : 'stagger', reaction === 'block' ? Math.max(start, seen - 0.02) : hitAt)
      this.land(d, move, hitAt, reaction, true, v, 'return')
    }
  }

  private counter(c: Side, after: 'slip' | 'duck', start: number, attackerFree: number) {
    const a = other(c)
    const move: MoveName = after === 'slip' ? this.rng.pick<MoveName>([['cross', 2], ['hook', 1.5], ['uppercut', 0.6]]) : this.rng.pick<MoveName>([['hook', 2], ['uppercut', 1.5], ['body', 1]])
    const v = this.vary(c)
    const hitAt = start + moveTiming(move, v).hitAt!
    this.move(c, move, start, v, !!MOVES[move].mirror && this.rng.chance(0.4))
    // the attacker is still recovering, so the read comes late if at all
    const free = hitAt > attackerFree + 0.12
    const reaction: Reaction = free && this.rng.chance(0.35) ? 'block' : 'hit'
    const clean = reaction === 'hit'
    const rocked = this.sim[a].rocked > 0
    if (reaction === 'block') this.move(a, 'block', Math.max(start, hitAt - 0.15))
    else this.move(a, MOVES[move].hit!.target === 'body' ? 'bodyFold' : 'stagger', hitAt, undefined, this.rng.chance(0.5))
    this.land(c, move, hitAt, rocked && clean && this.sim[a].knockdowns < 1 && this.ctx.p >= 0.2 && this.rng.chance(0.25) ? 'knockdown' : reaction, clean, v, 'counter')
  }

  trade(t: number) {
    const moves: MoveName[] = ['cross', 'hook', 'overhand']
    const score = [0, 1].map((i) => this.ctx.profiles[i].power * (0.5 + this.sim[i].stamina) * (1 + this.sim[i].momentum * 0.5) * this.rng.range(0.7, 1.3))
    const winner: Side = score[0] >= score[1] ? 0 : 1
    for (const i of [0, 1] as Side[]) {
      const move = this.rng.pick<MoveName>(moves.map((m) => [m, 1] as const))
      const v = this.vary(i)
      const start = t + (i === winner ? 0 : this.rng.range(0.02, 0.15))
      const hitAt = start + moveTiming(move, v).hitAt!
      const def = MOVES[move]
      this.move(i, move, start, v, !!def.mirror && this.rng.chance(0.3))
      const d = other(i)
      this.move(d, def.hit!.target === 'body' ? 'bodyFold' : 'stagger', hitAt + 0.02, undefined, this.rng.chance(0.5))
      this.land(i, move, hitAt, 'hit', i === winner, v, 'trade')
    }
  }

  feint(a: Side, t: number) {
    const d = other(a)
    this.move(a, 'feint', t, undefined, this.rng.chance(0.4))
    const bites = this.rng.chance(0.55 - this.ctx.profiles[d].reflex)
    if (bites) {
      this.move(d, this.rng.chance(0.6) ? 'block' : 'slip', t + this.reactionTime(d, 0) * 0.6, undefined, this.rng.chance(0.5))
      this.plan.beats.push({ at: t + 0.1, kind: 'feinted', who: d })
      this.sim[d] = { ...this.sim[d], feinted: 1.5 }
      this.plan.notes.push('feint')
    }
    if (this.rng.chance(bites ? 0.75 : 0.3)) this.attack(a, pickCombo(this.ctx, a, this.rng.chance(0.5) ? 'combo' : 'light', this.rng), t + 0.32)
    else this.plan.end = Math.max(this.plan.end, t + 0.6)
  }

  reset(who: Side, t: number) {
    const d = other(who)
    const dir = this.rng.chance(0.5) ? 1 : -1
    const intent: MoveIntent = this.ctx.trapped[who]
      ? this.rng.chance(0.6)
        ? { kind: 'pivot', dir }
        : { kind: 'clinch' }
      : this.rng.pick<MoveIntent>([
          [{ kind: 'circle', dir }, 3],
          [{ kind: 'hold', range: 2.3 }, 2],
          [{ kind: 'retreat' }, this.ctx.profiles[who].style === 'outboxer' ? 1.5 : 0.4],
          [{ kind: 'center' }, 0.6],
        ])
    this.range(who, intent, t, this.rng.range(0.3, 0.7), this.rng.range(1, 2))
    // the other side either follows them round or takes the centre
    const follow: MoveIntent = this.ctx.profiles[d].style === 'pressure' ? { kind: 'cutOff' } : this.rng.chance(0.5) ? { kind: 'circle', dir: (-dir) as 1 | -1 } : { kind: 'hold' }
    this.range(d, follow, t, this.rng.range(0.3, 0.7), this.rng.range(1, 2))
    this.plan.end = Math.max(this.plan.end, t + this.rng.range(0.6, 1.2))
  }
}
