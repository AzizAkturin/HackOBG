import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FighterBody, hitKick } from './physics.ts'

const peakAfterHook = (fps: number, damage = 0) => {
  const b = new FighterBody()
  b.kick(hitKick('hook', 'lead', () => 0.5))
  let peak = 0
  let settled = 0
  for (let t = 0; t < 3; t += 1 / fps) {
    b.step(1 / fps, damage, 0, false)
    peak = Math.max(peak, b.x.headYaw)
    if (Math.abs(b.x.headYaw) > 0.02) settled = t
  }
  return { peak, settled, end: b.x.headYaw }
}

test('a lead hook turns the head toward the defender\'s left and settles', () => {
  const r = peakAfterHook(60)
  assert.ok(r.peak > 0.3 && r.peak <= 0.9, `peak ${r.peak}`)
  assert.ok(Math.abs(r.end) < 1e-3)
})

test('spring response is frame-rate independent', () => {
  const a = peakAfterHook(144).peak
  const b = peakAfterHook(15).peak
  assert.ok(Math.abs(a - b) / a < 0.08, `${a} vs ${b}`)
})

test('damage makes the wobble last longer', () => {
  assert.ok(peakAfterHook(60, 0.9).settled > peakAfterHook(60, 0).settled)
})

test('huge kicks stay within limits and finite', () => {
  const b = new FighterBody()
  b.kick(hitKick('uppercut', 'rear', () => 0.99), 50)
  for (let i = 0; i < 300; i++) b.step(0.05, 1, 1, false)
  assert.ok(Object.values(b.x).every((v) => Number.isFinite(v) && Math.abs(v) <= 0.9))
})
