import assert from 'node:assert/strict'
import { test } from 'node:test'
import { initialStream, paceOf, STATUS_MAX, STATUS_TTL_SEC, streamReducer, TOKEN_BUDGET, type StreamEvent, type StreamState } from './fightStream.ts'

const step = (s: StreamState, to: number, events: StreamEvent[] = []) => streamReducer(s, { type: 'advance', to, events })
const status = (fighter: number, text: string): StreamEvent => ({ kind: 'status', fighter, text })
const progress = (fighter: number, tokens: number): StreamEvent => ({ kind: 'progress', fighter, tokens, budget: TOKEN_BUDGET })

test('progress sets tokens and finished marks the fighter done', () => {
  let s = step(initialStream(), 1, [progress(0, 300)])
  assert.equal(s.fighters[0].tokens, 300)
  s = step(s, 2, [{ kind: 'finished', fighter: 0, atMs: 2000 }])
  assert.ok(s.fighters[0].finished)
  assert.ok(!s.fighters[1].finished)
})

test('events that arrive between clock ticks are applied, not dropped', () => {
  const s = step(initialStream(), 5)
  const same = step(s, 5, [status(1, 'Thinking')])
  assert.deepEqual(same.fighters[1].feed.map((i) => i.text), ['Thinking'])
  assert.equal(step(same, 4), same)
})

test('a status is gone after the ttl', () => {
  const at = step(initialStream(), 6, [status(0, 'Drafting')])
  assert.ok(at.fighters[0].feed.some((i) => i.text === 'Drafting'))
  assert.ok(!step(at, 6 + STATUS_TTL_SEC).fighters[0].feed.length)
})

test('the feed keeps only the newest few, newest first', () => {
  let s = initialStream()
  for (let t = 1; t <= 6; t++) s = step(s, t, [status(0, `s${t}`)])
  assert.equal(s.fighters[0].feed.length, STATUS_MAX)
  const keys = s.fighters[0].feed.map((i) => i.key)
  assert.deepEqual(keys, [...keys].sort((a, b) => b - a))
})

test('reset clears everything', () => {
  const s = step(initialStream(), 3, [progress(1, 900), status(1, 'x')])
  assert.deepEqual(streamReducer(s, { type: 'reset' }), initialStream())
})

test('pace is the share of full effort over the window, capped, and never negative', () => {
  assert.equal(paceOf(0, 75, 1), 1)
  assert.equal(paceOf(0, 5000, 1), 1.5)
  assert.equal(paceOf(300, 100, 1), 0)
  assert.equal(paceOf(0, 100, 0), 0)
})

test('a fighter writing fast paces above one that is idle', () => {
  const s = step(step(initialStream(), 1), 2, [progress(0, 150)])
  assert.ok(s.fighters[0].pace > s.fighters[1].pace)
})
