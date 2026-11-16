import assert from 'node:assert/strict'
import { test } from 'node:test'
import { seeded } from './fight/rng.ts'
import { clampPose, GUARD, instantiate, mirrorPose, MOVES, moveTiming, rollVariation, sampleInstance, type MoveName, type Pose } from './moves.ts'

const names = Object.keys(MOVES) as MoveName[]
const flat = (p: Pose) => [p.fwd, p.side, p.drop, p.fall, p.yaw, p.pitch, p.roll, p.headPitch, p.headYaw, ...p.lead, p.leadElbow, ...p.rear, p.rearElbow]
const near = (a: Pose, b: Pose, eps = 1e-6) => flat(a).every((v, i) => Math.abs(v - flat(b)[i]) < eps)
const FROM: Pose = { ...GUARD, roll: 0.3, side: -0.2, lead: [-1.3, -0.1, 0.1], leadElbow: -0.9 }

test('every hit lands on a key', () => {
  for (const n of names) {
    const hit = MOVES[n].hit
    if (hit) assert.ok(MOVES[n].keys.some(([u]) => Math.abs(u - hit.at) < 1e-9), n)
  }
})

test('instances start at the current pose, hit exactly at hitAt, end in guard', () => {
  const rng = seeded(1)
  for (let r = 0; r < 200; r++) {
    for (const n of names) {
      for (const mirror of [false, true]) {
        const v = rollVariation(rng.next, { tempo: rng.range(0.8, 1.2), sloppy: rng.next() })
        const inst = instantiate(n, 10, FROM, v, { mirror })
        assert.ok(near(sampleInstance(inst, 10).pose, FROM), `${n} start`)
        const timing = moveTiming(n, v)
        assert.ok(Math.abs(timing.dur - inst.dur) < 1e-9, `${n} dur`)
        if (inst.hitAt !== undefined) {
          const hitKey = inst.keys.find(([u]) => Math.abs(u - MOVES[n].hit!.at) < 1e-9)!
          const p = sampleInstance(inst, 10 + inst.hitAt).pose
          const arm = inst.hand === 'lead' ? 'lead' : 'rear'
          assert.ok(Math.abs(p[arm][0] - hitKey[1][arm][0]) < 1e-6, `${n} hit arm`)
          assert.ok(Math.abs(p[`${arm}Elbow`] - hitKey[1][`${arm}Elbow`]) < 1e-6, `${n} hit elbow`)
        }
        if (!MOVES[n].hold) assert.ok(near(sampleInstance(inst, 10 + inst.dur).pose, GUARD), `${n} end`)
        for (let s = 0; s <= inst.dur; s += 1 / 120) {
          const p = clampPose(sampleInstance(inst, 10 + s).pose)
          assert.ok(flat(p).every(Number.isFinite), `${n} finite`)
          assert.ok(p.leadElbow <= 0 && p.rearElbow <= 0, `${n} elbows`)
        }
      }
    }
  }
})

test('mirroring twice is identity', () => {
  for (const n of names) for (const [, k] of MOVES[n].keys) {
    const p = { ...GUARD, ...k }
    assert.ok(near(mirrorPose(mirrorPose(p)), p, 1e-9), n)
  }
})

test('mirrored strikes throw with the other hand', () => {
  assert.equal(instantiate('hook', 0, GUARD, undefined, { mirror: true }).hand, 'rear')
  assert.equal(instantiate('jab', 0, GUARD, undefined, { mirror: true }).hand, 'lead')
})

test('chained moves have no pose jump at the hand-off', () => {
  const a = instantiate('jab', 0, GUARD)
  const handoff = a.recoverAt
  const before = sampleInstance(a, handoff).pose
  const b = instantiate('cross', handoff, before)
  assert.ok(near(sampleInstance(b, handoff).pose, before))
})
