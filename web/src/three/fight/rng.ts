export interface Rng {
  next(): number
  range(a: number, b: number): number
  chance(p: number): boolean
  pick<T>(weighted: readonly (readonly [T, number])[]): T
  /** log-normal with the given median and spread (sigma of the underlying normal) */
  logNormal(median: number, sigma: number): number
  fork(tag: number): Rng
}

export function seeded(seed: number): Rng {
  let s = seed >>> 0 || 0x9e3779b9
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0
    let x = s
    x = Math.imul(x ^ (x >>> 15), x | 1)
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
  const rng: Rng = {
    next,
    range: (a, b) => a + (b - a) * next(),
    chance: (p) => next() < p,
    pick(weighted) {
      const total = weighted.reduce((a, [, w]) => a + w, 0)
      let r = next() * total
      for (const [v, w] of weighted) if ((r -= w) < 0) return v
      return weighted[weighted.length - 1][0]
    },
    logNormal(median, sigma) {
      const u = Math.max(1e-9, next())
      const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * next())
      return median * Math.exp(sigma * z)
    },
    fork: (tag) => seeded(Math.imul(s ^ Math.imul(tag + 1, 0x85ebca6b), 0xc2b2ae35)),
  }
  return rng
}
