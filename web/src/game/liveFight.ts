import type { FightEvent } from '@wab/shared'
import type { CatalogModel } from '../data/fighters'
import { API_URL } from '../wallet/api'

export type FightLimits = { maxTokens: number; fightSeconds: number }

/** What the server offers: the model catalog, the starting pair, and the fight limits it enforces. */
export type FightConfig = { models: CatalogModel[]; defaults: [string, string]; limits: FightLimits }

export type FightOutcome = { idx: number; status: 'finished' | 'ko'; output: string; pitch: string; reason?: string }

/** One line of the server's NDJSON fight stream (server/src/routes/fights.ts). */
export type FightMessage =
  | { type: 'start'; fighters: { name: string; model: string; label: string }[]; limits: FightLimits }
  | { type: 'event'; tMs: number; event: FightEvent }
  | { type: 'text'; fighter: number; text: string }
  | { type: 'done'; outcomes: FightOutcome[] }
  | { type: 'error'; message: string }

export async function fetchFightConfig(signal?: AbortSignal): Promise<FightConfig> {
  const res = await fetch(`${API_URL}/api/fights/models`, { signal })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as FightConfig
}

/** Runs one real fight on the server and calls onMessage for each streamed line. Resolves when the stream closes. */
export async function streamFight(
  body: { prompt: string; category: string; fighters: { name: string; model: string }[] },
  onMessage: (msg: FightMessage) => void,
  signal: AbortSignal,
): Promise<void> {
  const res = await fetch(`${API_URL}/api/fights`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok || !res.body) {
    const err = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(err?.error ?? `fight: HTTP ${res.status}`)
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
  let buf = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buf += value
    let nl: number
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim()
      buf = buf.slice(nl + 1)
      if (line) onMessage(JSON.parse(line) as FightMessage)
    }
  }
}
