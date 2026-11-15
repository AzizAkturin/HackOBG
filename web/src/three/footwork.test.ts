import assert from 'node:assert/strict'
import { test } from 'node:test'
import { seeded } from './fight/rng.ts'
import { Locomotion, type MoveIntent } from './footwork.ts'
import { legAngles, LEG_Z, solveLeg, wheelHeading } from './gait.ts'
import { backroom, clampToRing, escapeDir, ringInfo, ringLimit, trapped } from './ringGeo.ts'

const R = 0.5

test('ring clamp is idempotent and inside the limit', () => {
  for (let x = -6; x <= 6; x += 0.25)
    for (let z = -6; z <= 6; z += 0.25) {
      const [cx, cz] = clampToRing(x, z, R)
      assert.ok(Math.abs(cx) <= ringLimit(R) + 1e-9 && Math.abs(cz) <= ringLimit(R) + 1e-9)
      assert.deepEqual(clampToRing(cx, cz, R), [cx, cz])
    }
})

test('corners, ropes and traps', () => {
  assert.ok(ringInfo(2.9, 2.9, R).cornered)
  assert.ok(!ringInfo(0, 2.9, R).cornered && ringInfo(0, 2.9, R).onRopes)
  assert.ok(trapped([0, 2.9], [0, 1.2], R))
  assert.ok(!trapped([0, 2.9], [0, 3.5], R))
  assert.equal(escapeDir([2.6, 2.9], [2.0, 1.4], R) * 1, -1)
  assert.ok(Math.abs(backroom(0, 0, 0, R) - ringLimit(R)) < 1e-9)
  assert.ok(Math.abs(backroom(0, 0, Math.PI / 2, R) - ringLimit(R)) < 1e-9)
})

const fresh = () => {
  const L = new Locomotion()
  L.configure([
    { scale: 1, wheel: false },
    { scale: 1, wheel: false },
  ])
  return L
}

const intents = (r: () => number): MoveIntent => {
  const d = (r() < 0.5 ? 1 : -1) as 1 | -1
  const all: MoveIntent[] = [{ kind: 'hold' }, { kind: 'press' }, { kind: 'cutOff' }, { kind: 'retreat' }, { kind: 'circle', dir: d }, { kind: 'pivot', dir: d }, { kind: 'clinch' }, { kind: 'center' }]
  return all[Math.floor(r() * all.length)]
}

test('fuzz: bodies never overlap, stay inside, stay finite', () => {
  const rng = seeded(7)
  for (let run = 0; run < 30; run++) {
    const L = fresh()
    let next = 0
    for (let t = 0; t < 60; ) {
      const dt = rng.range(0.005, 0.05)
      t += dt
      if (t > next) {
        next = t + rng.range(0.3, 2)
        L.setIntent(0, intents(rng.next), { urgency: rng.next() })
        L.setIntent(1, intents(rng.next), { urgency: rng.next() })
        if (rng.chance(0.2)) L.push(rng.chance(0.5) ? 0 : 1, -rng.range(0, 2), rng.range(-1, 1))
      }
      L.step(dt)
      const [a, b] = L.f
      const min = (a.radius + b.radius) * 0.95 - 1e-3
      assert.ok(L.sep() >= min, `overlap ${L.sep()}`)
      for (const f of L.f) {
        assert.ok(Number.isFinite(f.x) && Number.isFinite(f.z) && Number.isFinite(f.rotY))
        assert.ok(Math.abs(f.x) <= ringLimit(f.radius) + 1e-6 && Math.abs(f.z) <= ringLimit(f.radius) + 1e-6)
      }
    }
  }
})

test('pressing pins a retreating fighter on the ropes', () => {
  const L = fresh()
  L.setIntent(0, { kind: 'cutOff' }, { urgency: 1 })
  L.setIntent(1, { kind: 'retreat' }, { urgency: 0.5 })
  let pinned = false
  for (let t = 0; t < 10 && !pinned; t += 1 / 60) {
    L.step(1 / 60)
    pinned = L.query(1).ring.onRopes
  }
  assert.ok(pinned)
})

test('pivot gets off the ropes', () => {
  const L = fresh()
  L.f[1].x = ringLimit(R) - 0.05
  L.f[0].x = L.f[1].x - 1.9
  L.setIntent(0, { kind: 'hold' })
  L.setIntent(1, { kind: 'pivot', dir: 1 }, { urgency: 1 })
  for (let t = 0; t < 1.5; t += 1 / 60) L.step(1 / 60)
  assert.ok(L.query(1).ring.ropeDist > 0.5, `ropeDist ${L.query(1).ring.ropeDist}`)
})

test('hold keeps range', () => {
  const L = fresh()
  L.setIntent(0, { kind: 'hold', range: 2 })
  L.setIntent(1, { kind: 'hold', range: 2 })
  for (let t = 0; t < 4; t += 1 / 60) L.step(1 / 60)
  assert.ok(Math.abs(L.sep() - 2) < 0.35, `sep ${L.sep()}`)
})

test('crossed fighters reach their seats', () => {
  const L = fresh()
  L.f[0].x = 2
  L.f[1].x = -2
  L.setIntent(0, { kind: 'goto', x: -2.85, z: 2.85, face: 'travel' })
  L.setIntent(1, { kind: 'goto', x: 2.85, z: -2.85, face: 'travel' })
  for (let t = 0; t < 8; t += 1 / 60) L.step(1 / 60)
  assert.ok(Math.hypot(L.f[0].x + 2.85, L.f[0].z - 2.85) < 0.2)
  assert.ok(Math.hypot(L.f[1].x - 2.85, L.f[1].z + 2.85) < 0.2)
})

test('clinch locks then breaks apart', () => {
  const L = fresh()
  L.f[0].x = -0.8
  L.f[1].x = 0.8
  let broke = false
  L.onBreak = () => (broke = true)
  L.setIntent(0, { kind: 'clinch' })
  for (let t = 0; t < 5; t += 1 / 60) L.step(1 / 60)
  assert.ok(broke)
  assert.ok(L.sep() > 1.2)
})

const RIG = { hip: 1.4, thigh: 0.7, hipX: 0.3 }
const P = { drop: 0.1, fwd: 0, side: 0, hipYaw: 0, weight: 0 }

test('two-bone legs: straight when fully extended, knee bent when the hips drop', () => {
  const s = solveLeg(1.4 * 0.995, 0, 0, 0.7, 0.7)
  assert.ok(Math.abs(s.thighZ) < 1e-9 && s.knee < 0.25)
  const k = Math.acos(1 - 0.2 / 1.4)
  const b = solveLeg(1.2, 0, 0, 0.7, 0.7)
  assert.ok(Math.abs(b.thighX + k) < 1e-6 && Math.abs(b.knee - 2 * k) < 1e-6)
})

test('planted feet stay put while the hips turn and shift', () => {
  const sole = (g: ReturnType<typeof legAngles>[number]) => {
    // forward kinematics, YZX order: yaw outermost, then lateral, then sagittal
    const l1 = RIG.thigh
    const l2 = RIG.hip - RIG.thigh
    const sag = (a: number, l: number) => [-Math.sin(a) * l, -Math.cos(a) * l]
    const [z1, y1] = sag(g.thighX, l1)
    const [z2, y2] = sag(g.thighX + g.knee, l2)
    let x = 0
    let y = y1 + y2
    let z = z1 + z2
    ;[x, y] = [x * Math.cos(g.thighZ) - y * Math.sin(g.thighZ), x * Math.sin(g.thighZ) + y * Math.cos(g.thighZ)]
    ;[x, z] = [x * Math.cos(g.thighY) + z * Math.sin(g.thighY), -x * Math.sin(g.thighY) + z * Math.cos(g.thighY)]
    return [g.x + x, g.y + y, g.z + z]
  }
  const still = { vf: 0, vs: 0, turn: 0, phase: 0 }
  const [a0, a1] = legAngles(still, RIG, P).map(sole)
  const [b0, b1] = legAngles(still, RIG, { drop: 0.2, fwd: 0.1, side: 0.05, hipYaw: 0.25, weight: 0 }).map(sole)
  for (const [p, q] of [[a0, b0], [a1, b1]]) for (let k = 0; k < 3; k++) assert.ok(Math.abs(p[k] - q[k]) < 0.02, `${p} vs ${q}`)
  assert.ok(Math.abs(a0[2] - LEG_Z) < 0.02 && Math.abs(a0[1]) < 0.02)
})

test('gait: sideways steps abduct, back steps reverse, turning lifts in place', () => {
  const side = legAngles({ vf: 0, vs: 1, turn: 0, phase: 1 }, RIG, P)
  assert.ok(Math.abs(side[0].thighZ) > 0.05)
  const fwd = legAngles({ vf: 1, vs: 0, turn: 0, phase: 1 }, RIG, P)
  const back = legAngles({ vf: -1, vs: 0, turn: 0, phase: 1 }, RIG, P)
  assert.ok(Math.sign(fwd[0].thighX - back[0].thighX) !== 0)
  const turn = legAngles({ vf: 0, vs: 0, turn: 5, phase: 1 }, RIG, P)
  const still = legAngles({ vf: 0, vs: 0, turn: 0, phase: 1 }, RIG, P)
  assert.ok(turn[0].knee > still[0].knee)
  for (const a of [-3, -1, 0, 1, 3]) assert.ok(Math.abs(wheelHeading({ vf: Math.cos(a), vs: Math.sin(a), turn: 0, phase: 0 }).yaw) <= Math.PI / 2 + 1e-9)
})
