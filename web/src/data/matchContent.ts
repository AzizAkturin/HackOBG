// the three voted rounds; each brief is appended to the match prompt for that round's live fight

export type RoundKey = 'pitch' | 'aspects' | 'mvp'

export const ROUNDS: { key: RoundKey; name: string; short: string; brief: string }[] = [
  { key: 'pitch', name: 'Elevator pitch', short: 'Pitch', brief: 'Sell the idea in 30 seconds.' },
  { key: 'aspects', name: 'Aspects', short: 'Aspects', brief: 'Scalability, profit, risks: does it hold up?' },
  { key: 'mvp', name: 'MVP', short: 'MVP', brief: 'What ships first, and how you know it works.' },
]
