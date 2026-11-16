import type { FightEvent } from '@wab/shared'
import { API_URL } from '../wallet/api'

export type FightModel = { id: string; label: string; maker: string; weightClass: string }

export type FightOutcome = { idx: number; status: 'finished' | 'ko'; output: string; pitch: string; reason?: string }

/** One line of the server's NDJSON fight stream (server/src/routes/fights.ts). */
export type FightMessage =
  | { type: 'start'; fighters: { name: string; model: string; label: string }[]; limits: { maxTokens: number; fightSeconds: number } }
  | { type: 'event'; tMs: number; event: FightEvent }
  | { type: 'text'; fighter: number; text: string }
  | { type: 'done'; outcomes: FightOutcome[] }
  | { type: 'error'; message: string }

export const DEFAULT_MODELS: [string, string] = ['nemotron-3.5-lightning', 'ernie-5.5-flash']

export async function listModels(): Promise<FightModel[]> {
  const res = await fetch(`${API_URL}/api/fights/models`)
  if (!res.ok) throw new Error(`models: HTTP ${res.status}`)
  return ((await res.json()) as { models: FightModel[] }).models
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
