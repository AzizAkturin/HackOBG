// dev-only fight controls, enabled with ?debug in the URL
import type { FightDirector, Reaction } from './director'
import type { MoveName } from './moves'

const KEYS: Record<string, [MoveName[], Reaction]> = {
  '1': [['jab'], 'hit'],
  '2': [['cross'], 'hit'],
  '3': [['hook'], 'hit'],
  '4': [['uppercut'], 'hit'],
  '5': [['body'], 'hit'],
  '6': [['overhand'], 'knockdown'],
  '7': [['jab', 'cross', 'hook'], 'hit'],
  b: [['jab', 'cross', 'hook'], 'block'],
  s: [['jab', 'cross'], 'slip'],
  d: [['hook', 'overhand'], 'duck'],
}

export function attachDebug(director: FightDirector) {
  const w = window as unknown as { __director?: FightDirector }
  w.__director = director
  let attacker = 0
  const onKey = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
    const k = e.key.toLowerCase()
    if (k === 'tab') {
      e.preventDefault()
      attacker = 1 - attacker
    } else if (k === '[') director.timeScale = Math.max(0.0625, director.timeScale / 2)
    else if (k === ']') director.timeScale = Math.min(2, director.timeScale * 2)
    else if (k === 'f') director.freeze(1)
    else if (KEYS[k]) director.force(attacker, ...KEYS[k])
    else return
    console.log(`[fight] attacker ${attacker} timeScale ${director.timeScale}`)
  }
  window.addEventListener('keydown', onKey)
  return () => {
    window.removeEventListener('keydown', onKey)
    delete w.__director
  }
}
