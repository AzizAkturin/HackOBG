import assert from 'node:assert/strict'
import { test } from 'node:test'
import { initialStream, mockEvents, mockFighterCount, mockTokens, paceOf, STATUS_MAX, STATUS_TTL_SEC, streamReducer, TOKEN_BUDGET, type StreamState } from './fightStream.ts'

const step = (s: StreamState, to: number) => streamReducer(s, { type: 'advance', to, events: mockEvents(s.t, to) })

const run = (to: number) => {
  let s = initialStream()
  for (let t = 1; t <= to; t++) s = step(s, t)
  return s
}

test('tokens never decrease and never pass the budget', () => {
  for (let f = 0; f < mockFighterCount; f++) {
    let last = 0
    for (let t = 0; t <= 40; t += 0.5) {
      const n = mockTokens(f, t)
      assert.ok(n >= last && n <= TOKEN_BUDGET, `fighter ${f} at ${t}`)
      last = n
    }
  }
})

test('the quicker fighter is further along early on', () => {
  assert.ok(mockTokens(0, 6) > mockTokens(1, 6) * 3)
})

test('each status and finish is emitted exactly once across windows', () => {
  const all = Array.from({ length: 30 }, (_, t) => mockEvents(t, t + 1)).flat()
  for (let f = 0; f < mockFighterCount; f++) {
    assert.equal(all.filter((e) => e.kind === 'finished' && e.fighter === f).length, 1)
    const texts = all.flatMap((e) => (e.kind === 'status' && e.fighter === f ? [e.text] : []))
    assert.equal(texts.filter((t) => t === 'Finished').length, 1)
  }
})

test('advancing to the same or an earlier second changes nothing', () => {
  const s = run(10)
  assert.equal(step(s, 10), s)
  assert.equal(step(s, 4), s)
})

test('a status shows up on its second and is gone after the ttl', () => {
  const at = step(run(5), 6)
  assert.ok(at.fighters[0].feed.some((i) => i.text === 'Drafting: The problem'))
  const later = step(at, 6 + STATUS_TTL_SEC)
  assert.ok(!later.fighters[0].feed.some((i) => i.text === 'Drafting: The problem'))
})

test('the feed keeps only the newest few, newest first', () => {
  const s = run(21)
  for (const f of s.fighters) assert.ok(f.feed.length <= STATUS_MAX)
  const keys = run(10).fighters[0].feed.map((i) => i.key)
  assert.deepEqual(keys, [...keys].sort((a, b) => b - a))
})

test('finishing marks the fighter done and reset clears everything', () => {
  const done = run(23 + STATUS_TTL_SEC)
  assert.ok(done.fighters.every((f) => f.finished))
  assert.ok(done.fighters.every((f) => f.feed.length === 0))
  assert.deepEqual(streamReducer(done, { type: 'reset' }), initialStream())
})

test('pace is the share of full effort over the window, capped, and never negative', () => {
  assert.equal(paceOf(0, 75, 1), 1)
  assert.equal(paceOf(0, 5000, 1), 1.5)
  assert.equal(paceOf(300, 100, 1), 0)
  assert.equal(paceOf(0, 100, 0), 0)
})

test('the quick fighter paces higher early, the thinker catches up later, a finished fighter drops to zero', () => {
  const early = run(6)
  assert.ok(early.fighters[0].pace > early.fighters[1].pace + 0.5)
  const late = run(15)
  assert.ok(late.fighters[1].pace > late.fighters[0].pace)
  assert.equal(run(22).fighters[0].pace, 0)
})

test('actions are emitted once each, only the planned kinds, and fighter 0 taunts first on finishing', () => {
  const acts = Array.from({ length: 30 }, (_, t) => mockEvents(t, t + 1)).flat().flatMap((e) => (e.kind === 'action' ? [e] : []))
  assert.ok(acts.every((a) => a.intensity > 0 && a.intensity <= 1))
  assert.deepEqual(acts.filter((a) => a.move === 'taunt').map((a) => a.fighter), [0])
  assert.ok(acts.filter((a) => a.fighter === 1 && a.move === 'circle').length >= 2)
  assert.equal(acts.filter((a) => a.move === 'stagger').length, 1)
})
