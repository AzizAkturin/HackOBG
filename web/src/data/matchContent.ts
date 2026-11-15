// SAMPLE CONTENT for the simulated match: what each robot submits in each voted round.
// The live version comes from the fight runner's pitches (committed on-chain by pitchesHash).

export type RoundKey = 'pitch' | 'aspects' | 'mvp'

export const ROUNDS: { key: RoundKey; name: string; short: string; brief: string }[] = [
  { key: 'pitch', name: 'Elevator pitch', short: 'Pitch', brief: 'Sell the idea in 30 seconds.' },
  { key: 'aspects', name: 'Aspects', short: 'Aspects', brief: 'Scalability, profit, risks: does it hold up?' },
  { key: 'mvp', name: 'MVP', short: 'MVP', brief: 'What ships first, and how you know it works.' },
]

/** submissions[round][fighterIndex] */
export const submissions: Record<RoundKey, [string, string]> = {
  pitch: [
    `SpinCycle turns idle laundromats into neighborhood micro-fulfillment hubs. Stores sit 70% empty outside weekend peaks, so we rent that dead space to local shops and couriers as smart-locker pickup points, and run wash-and-fold orders overnight. Same floor, same machines, a second business.`,
    `Laundromats don't have a demand problem. They have a dead-time problem. Fold & Co. sells the 90-minute wait as a $12/month membership: coffee, fast Wi-Fi, bookable work booths, a kids' corner, and a guaranteed machine at peak hours.`,
  ],
  aspects: [
    `Scalability: lockers and app are hardware-light, so a store converts in two days. Franchise groups own 30-200 stores each, which makes them our channel.
Profit: $4 per locker pickup + 15% of wash-and-fold + $199/month SaaS. A 40-machine store adds about $6,800/month.
Risk: courier demand is local; we only enter zip codes with 3+ partner shops signed first.`,
    `Scalability: a white-label kit (furniture, POS, app) converts a store in one weekend, no new floor space.
Profit: owners keep wash revenue and split memberships 60/40. The Austin pilot hit 410 members in 8 weeks, about $2,950/month to the owner.
Risk: memberships churn. Peak-hour machine guarantees are what keep people paying.`,
  ],
  mvp: [
    `MVP in 6 weeks: 12 lockers and a pickup app in 3 Queens stores, wash-and-fold booking only, no SaaS dashboard yet.
Success = 150 pickups/week per store by week 6 and two shops renewing their locker plan. If pickups stall under 60, we pivot to pure wash-and-fold.`,
    `MVP in 4 weeks: one Austin store, a coffee cart, 6 booths, and a Stripe membership page. Machine guarantees run off a shared Google Sheet before we build software.
Success = 250 members and 30%+ weekday traffic lift at 8 weeks. Below 100 members, we cut the booths and test coffee alone.`,
  ],
}
