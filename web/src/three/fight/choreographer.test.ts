import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MOVES, moveTiming, type RangeBand } from '../moves.ts'
import { choreograph, decide, type Beat, type Ctx, type Intent } from './choreographer.ts'
import { freshState, profileFor, type FighterState, type Style } from './fighter.ts'
import { gap, startRhythm, stepRhythm, tension } from './rhythm.ts'
import { seeded } from './rng.ts'

const brandFor: Record<Style, string> = { counter: 'anthropic', pressure: 'meta', outboxer: 'openai' }

function ctx(o: Partial<Ctx> & { styles?: [Style, Style]; states?: [Partial<FighterState>, Partial<FighterState>] } = {}): Ctx {
  const styles = o.styles ?? ['pressure', 'counter']
  return {
    t: 10,
    p: 0.5,
    fighters: [{ ...freshState(), ...o.states?.[0] }, { ...freshState(), ...o.states?.[1] }],
    profiles: [profileFor({ brand: brandFor[styles[0]] }), profileFor({ brand: brandFor[styles[1]] })],
    rhythm: { mode: 'work', until: 99, intensity: 0.6 },
    band: 'punching' as RangeBand,
    trapped: [false, false],
    backroom: [2, 2],
    work: [0.5, 0.5],
    busy: [false, false],
    ...o,
  }
}

const strikes = (beats: Beat[]) => beats.filter((b): b is Extract<Beat, { kind: 'move' }> => b.kind === 'move' && !!MOVES[b.move].hit)
const impacts = (beats: Beat[]) => beats.filter((b): b is Extract<Beat, { kind: 'impact' }> => b.kind === 'impact')

test('every impact lines up with a strike frame, defences come before, reactions at or after', () => {
  const rng = seeded(3)
  for (let n = 0; n < 1000; n++) {
    const c = ctx()
    const plan = choreograph(c, decide(c, rng), rng)
    for (const imp of impacts(plan.beats)) {
      const s = strikes(plan.beats).find((b) => b.who === imp.who && b.move === imp.move && Math.abs(b.at + moveTiming(b.move, b.v).hitAt! - imp.at) < 1e-9)
      assert.ok(s, `no strike for impact ${imp.move}`)
      const defender = 1 - imp.who
      const answers = plan.beats.filter((b) => b.kind === 'move' && b.who === defender && b.at <= imp.at + 0.05 && b.at >= s.at - 0.01)
      if (imp.reaction === 'block' || imp.reaction === 'slip' || imp.reaction === 'duck') assert.ok(answers.some((b) => b.at <= imp.at), `late ${imp.reaction}`)
    }
    assert.ok(plan.end >= c.t)
    for (const b of plan.beats) assert.ok(b.at >= c.t - 1e-9)
  }
})

test('a fighter never starts a new strike before the last one recovered, except counters and trades', () => {
  const rng = seeded(4)
  for (let n = 0; n < 1000; n++) {
    const c = ctx()
    const plan = choreograph(c, { kind: 'attack', who: 0, weight: rng.pick([['light', 1], ['combo', 1], ['power', 1]] as const) }, rng)
    const mine = strikes(plan.beats).filter((b) => b.who === 0)
    for (let k = 1; k < mine.length; k++) {
      const prev = mine[k - 1]
      assert.ok(mine[k].at >= prev.at + moveTiming(prev.move, prev.v).hitAt! - 1e-9, 'overlap')
    }
  }
})

test('reaction timing varies instead of a fixed lead', () => {
  const rng = seeded(5)
  const leads: number[] = []
  for (let n = 0; n < 500; n++) {
    const c = ctx()
    const plan = choreograph(c, { kind: 'attack', who: 0, weight: 'light' }, rng)
    const imp = impacts(plan.beats)[0]
    const def = plan.beats.find((b) => b.kind === 'move' && b.who === 1 && (b.move === 'block' || b.move === 'slip' || b.move === 'duck' || b.move === 'coverUp'))
    if (imp && def) leads.push(imp.at - def.at)
  }
  const mean = leads.reduce((a, b) => a + b, 0) / leads.length
  const sd = Math.sqrt(leads.reduce((a, b) => a + (b - mean) ** 2, 0) / leads.length)
  assert.ok(sd > 0.04, `sd ${sd}`)
})

const rate = (c: Ctx, seed: number, fn: (beats: Beat[]) => boolean, n = 1500) => {
  const rng = seeded(seed)
  let k = 0
  for (let i = 0; i < n; i++) if (fn(choreograph(c, { kind: 'attack', who: 0, weight: 'combo' }, rng).beats)) k++
  return k / n
}

test('tired, hurt and rocked defenders get hit cleaner', () => {
  const clean = (beats: Beat[]) => impacts(beats).some((b) => b.who === 0 && b.reaction === 'hit' && b.clean)
  const base = rate(ctx(), 6, clean)
  const tired = rate(ctx({ states: [{}, { stamina: 0.2, damage: 0.6 }] }), 6, clean)
  const rocked = rate(ctx({ states: [{}, { rocked: 2 }] }), 6, clean)
  assert.ok(tired > base, `${tired} vs ${base}`)
  assert.ok(rocked > base * 1.4, `${rocked} vs ${base}`)
})

test('counterpunchers counter far more than pressure fighters', () => {
  const countered = (beats: Beat[]) => impacts(beats).some((b) => b.note === 'counter')
  const counter = rate(ctx({ styles: ['pressure', 'counter'] }), 7, countered)
  const pressure = rate(ctx({ styles: ['counter', 'pressure'] }), 7, countered)
  assert.ok(counter >= pressure * 2, `${counter} vs ${pressure}`)
  const rng = seeded(8)
  for (let n = 0; n < 500; n++) {
    const plan = choreograph(ctx(), { kind: 'attack', who: 0, weight: 'combo' }, rng)
    const imps = impacts(plan.beats)
    const ci = imps.findIndex((b) => b.note === 'counter')
    if (ci > 0) assert.ok(imps[ci - 1].reaction === 'slip' || imps[ci - 1].reaction === 'duck')
  }
})

test('knockdowns only happen to rocked fighters, never early, at most once', () => {
  const rng = seeded(9)
  for (let n = 0; n < 2000; n++) {
    const fresh = impacts(choreograph(ctx(), { kind: 'attack', who: 0, weight: 'power' }, rng).beats)
    const kd = fresh.findIndex((b) => b.reaction === 'knockdown')
    if (kd >= 0) assert.ok(fresh.slice(0, kd).some((b) => b.rocked), 'knockdown without being rocked first')
    const early = choreograph(ctx({ p: 0.1, states: [{}, { rocked: 2 }] }), { kind: 'attack', who: 0, weight: 'power' }, rng)
    assert.ok(!impacts(early.beats).some((b) => b.reaction === 'knockdown'))
    const done = choreograph(ctx({ states: [{}, { rocked: 2, knockdowns: 1 }] }), { kind: 'attack', who: 0, weight: 'power' }, rng)
    assert.ok(!impacts(done.beats).some((b) => b.reaction === 'knockdown' && b.who === 0))
  }
  assert.ok(rate(ctx({ states: [{}, { rocked: 2 }] }), 10, (b) => impacts(b).some((x) => x.reaction === 'knockdown')) > 0.05)
})

test('same seed, same plan', () => {
  const a = choreograph(ctx(), { kind: 'attack', who: 1, weight: 'combo' }, seeded(11))
  const b = choreograph(ctx(), { kind: 'attack', who: 1, weight: 'combo' }, seeded(11))
  assert.deepEqual(a, b)
})

test('rhythm builds toward the bell and pacing is uneven', () => {
  assert.ok(tension(0.95) > tension(0.15))
  const rng = seeded(12)
  let r = startRhythm(0)
  const gaps: number[] = []
  const modes = new Set<string>()
  for (let t = 0; t < 180; t += 0.5) {
    r = stepRhythm(r, { t, p: t / 180, stamina: 0.8, rocked: false, work: 0.5 }, rng)
    modes.add(r.mode)
    gaps.push(gap(r, 0.8, rng))
  }
  assert.ok(modes.has('flurry') && modes.has('lull'))
  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length
  const cv = Math.sqrt(gaps.reduce((a, b) => a + (b - mean) ** 2, 0) / gaps.length) / mean
  assert.ok(cv > 0.3, `cv ${cv}`)
})

test('decide never hands the initiative to a busy fighter', () => {
  const rng = seeded(13)
  for (let n = 0; n < 500; n++) {
    const intent: Intent = decide(ctx({ busy: [true, false] }), rng)
    if (intent.kind === 'attack' || intent.kind === 'feint' || intent.kind === 'reset' || intent.kind === 'showboat') assert.equal(intent.who, 1)
    assert.notEqual(intent.kind, 'trade')
  }
})
