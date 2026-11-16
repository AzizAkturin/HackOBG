import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { applyTrade, matchOdds, openMarket, priceA, quoteBuy, quoteSell, reanchor, roundOdds, type MarketState } from '@wab/shared'
import { ROUNDS } from '../data/matchContent'
import { fightersFor, matchClass } from '../data/fighters'
import type { MarketHistory, PricePoint, StageSpan } from './marketHistory'
import type { FightEvent } from '@wab/shared'
import { fetchFightConfig, streamFight, type FightConfig, type FightMessage, type FightOutcome } from './liveFight'

/**
 * One live match on the WAB contract's rules (ADR-0017): trading from even odds, then best-of-3
 * rounds where trading closes, robots fight, position holders vote on blind pitches, and the price re-anchors.
 * The fights are real: each round streams two OpenRouter models from the server (POST /api/fights).
 * The market and crowd are still simulated locally with the contract's math until the contract is deployed.
 */

export type MatchPhase = 'trading' | 'fighting' | 'voting' | 'final'
export type Side = 0 | 1

export const SEC = { start: 45, vote: 25, between: 25, final: 30 } as const
/** extra wait past the server's fight deadline before the round is called off */
const FIGHT_GRACE_MS = 20_000
export const LIMITS = { min: 0.05, max: 0.3 } // Middleweight class on the contract
/** Demo only: ?speed=4 runs the simulated match 4x faster. */
const SPEED = (typeof window !== 'undefined' && Number(new URLSearchParams(window.location.search).get('speed'))) || 1
const ms = (sec: number) => (sec * 1000) / SPEED
const LIQUIDITY = 1
const FEE_BPS = 200

export type RoundResult = {
  index: number
  winner: Side
  /** votes per fighter (not per label) */
  votes: [number, number]
  /** label 0 ("Pitch A") belonged to fighter B */
  swapped: boolean
  priceBefore: number
  priceAfter: number
}

export type FeedItem = { key: number; at: number; who: string; side: Side; isBuy: boolean; mon: number; priceA: number; mine?: boolean }

export type LiveFight = {
  key: string
  startedAt: number
  /** raw streamed answer per fighter */
  texts: [string, string]
  events: FightEvent[]
  outcomes: FightOutcome[] | null
  error: string | null
  done: boolean
}

export type MatchSetup = { task: string; models: [string, string] }

type Position = { shares: [number, number]; cost: [number, number]; firstAt: [number | null, number | null]; firstPrice: [number, number] }

type State = {
  now: number
  start: number
  phase: MatchPhase
  endsAt: number
  phaseLen: number
  wins: [number, number]
  results: RoundResult[]
  market: MarketState
  points: PricePoint[]
  spans: StageSpan[]
  balance: number
  pos: Position
  swapped: boolean
  /** votes per label for the current round */
  votes: [number, number]
  myVote: number | null
  favored: Side
  feed: FeedItem[]
  claimed: boolean
  payout: number
  /** fair price of A at the last open / re-anchor; the simulated crowd trades back toward it */
  fairA: number
  setup: MatchSetup
  /** the opening bell only counts down once someone starts the match, so idle tabs never spend credits */
  armed: boolean
  fight: LiveFight | null
  /** server catalog, defaults and limits; null until GET /api/fights/models answers */
  config: FightConfig | null
  configError: string | null
  /** counts matches played in this session, for the M001 label */
  matchNo: number
}

type Action =
  | { type: 'tick'; now: number; r: [number, number] }
  | { type: 'crowdTrade'; side: Side; mon: number; sell: boolean; who: string }
  | { type: 'crowdVote'; r: number }
  | { type: 'buy'; side: Side; mon: number }
  | { type: 'cashOut'; side: Side }
  | { type: 'vote'; label: number }
  | { type: 'claim' }
  | { type: 'setup'; setup: Partial<MatchSetup> }
  | { type: 'arm'; now: number; bellNow: boolean }
  | { type: 'fightMsg'; key: string; msg: FightMessage }
  | { type: 'fightClosed'; key: string; error?: string }
  | { type: 'config'; config: FightConfig }
  | { type: 'configError'; message: string }

// no fight history is recorded yet, so every match opens at even odds
export const ROUND_ODDS = roundOdds({ wins: 0, losses: 0 }, { wins: 0, losses: 0 })

export const randomAddress = () => {
  const hex = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0')
  return `0x${hex()}…${hex().slice(0, 2)}`
}

let feedKey = 0
const emptyPos = (): Position => ({ shares: [0, 0], cost: [0, 0], firstAt: [null, null], firstPrice: [0, 0] })

const fightKey = (s: Pick<State, 'start' | 'results'>) => `${s.start}-${s.results.length}`

type Carry = Pick<State, 'balance' | 'setup' | 'config' | 'configError' | 'matchNo'>

function fresh(now: number, carry: Carry = { balance: 1, setup: { task: '', models: ['', ''] }, config: null, configError: null, matchNo: 1 }): State {
  const market = openMarket(ROUND_ODDS, LIQUIDITY, FEE_BPS)
  return {
    now,
    start: now,
    phase: 'trading',
    endsAt: Infinity,
    phaseLen: SEC.start,
    wins: [0, 0],
    results: [],
    market,
    points: [{ t: now, priceA: priceA(market) }],
    spans: [{ stage: 1, label: 'Start', from: now, to: Infinity, trading: true }],
    pos: emptyPos(),
    swapped: false,
    votes: [0, 0],
    myVote: null,
    favored: 0,
    feed: [],
    claimed: false,
    payout: 0,
    fairA: priceA(market),
    armed: false,
    fight: null,
    ...carry,
  }
}

function onFightMsg(f: LiveFight, msg: FightMessage): LiveFight {
  switch (msg.type) {
    case 'text': {
      const texts: [string, string] = [...f.texts]
      texts[msg.fighter] = (texts[msg.fighter] ?? '') + msg.text
      return { ...f, texts }
    }
    case 'event':
      return { ...f, events: [...f.events, msg.event] }
    case 'done':
      return { ...f, outcomes: msg.outcomes, done: true }
    case 'error':
      return { ...f, error: msg.message, done: true }
    case 'start':
      return f
  }
}

const closeSpan = (spans: StageSpan[], t: number) => spans.map((s, i) => (i === spans.length - 1 ? { ...s, to: t } : s))
const pushFeed = (feed: FeedItem[], item: Omit<FeedItem, 'key'>) => [{ ...item, key: ++feedKey }, ...feed].slice(0, 12)

const fightersOf = (s: Pick<State, 'setup' | 'config'>) => fightersFor(s.setup.models, s.config?.models ?? [])
// 'arm' refuses to start before the server config arrives, so a running match always has it
const fightSeconds = (s: State) => s.config!.limits.fightSeconds

function advance(s: State, now: number, r: [number, number]): State {
  const round = s.results.length
  switch (s.phase) {
    case 'trading':
      // The blind shuffle is fixed when the fight starts, so live writing and the vote use the same labels.
      return {
        ...s,
        phase: 'fighting',
        swapped: r[0] < 0.5,
        endsAt: now + fightSeconds(s) * 1000,
        phaseLen: fightSeconds(s),
        fight: { key: fightKey(s), startedAt: now, texts: ['', ''], events: [], outcomes: null, error: null, done: false },
        votes: [0, 0],
        myVote: null,
        spans: [...closeSpan(s.spans, now), { stage: round + 2, label: ROUNDS[round]!.name, from: now, to: Infinity, trading: false }],
      }
    case 'fighting':
      return {
        ...s,
        phase: 'voting',
        endsAt: now + ms(SEC.vote),
        phaseLen: SEC.vote,
        favored: r[1] < 0.5 ? 0 : 1,
      }
    case 'voting': {
      const byFighter: [number, number] = s.swapped ? [s.votes[1], s.votes[0]] : [s.votes[0], s.votes[1]]
      const winner: Side = byFighter[0] > byFighter[1] ? 0 : byFighter[1] > byFighter[0] ? 1 : r[0] < 0.5 ? 0 : 1
      const wins: [number, number] = winner === 0 ? [s.wins[0] + 1, s.wins[1]] : [s.wins[0], s.wins[1] + 1]
      const priceBefore = priceA(s.market)
      const done = wins[0] === 2 || wins[1] === 2
      const market = done ? s.market : reanchor(s.market, ROUND_ODDS, wins[0], wins[1])
      const priceAfter = done ? (winner === 0 ? 1 : 0) : priceA(market)
      const result: RoundResult = { index: round, winner, votes: byFighter, swapped: s.swapped, priceBefore, priceAfter }
      const name = fightersOf(s)[winner].name
      const spans = closeSpan(s.spans, now).map((sp, i, a) => (i === a.length - 1 ? { ...sp, result: `${name} won` } : sp))
      const base = { ...s, wins, market, fairA: priceAfter, results: [...s.results, result], points: [...s.points, { t: now, priceA: priceAfter }] }
      if (done) {
        const payout = s.pos.shares[winner]
        return { ...base, phase: 'final', endsAt: now + ms(SEC.final), phaseLen: SEC.final, spans, payout }
      }
      return {
        ...base,
        phase: 'trading',
        endsAt: now + ms(SEC.between),
        phaseLen: SEC.between,
        spans: [...spans, { stage: round + 2, label: 'Trading', from: now, to: Infinity, trading: true }],
      }
    }
    case 'final':
      // next match waits for someone to start it; unclaimed winnings carry over
      return fresh(now, { balance: s.balance + (s.claimed ? 0 : s.payout), setup: s.setup, config: s.config, configError: s.configError, matchNo: s.matchNo + 1 })
  }
}

function buyInto(s: State, side: Side, mon: number): { market: MarketState; shares: number } {
  const { shares } = quoteBuy(s.market, side, mon)
  return { market: applyTrade(s.market, side, shares), shares }
}

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'tick': {
      const next = { ...s, now: a.now }
      if (s.phase === 'fighting' && s.fight && !s.fight.done) {
        if (a.now < s.endsAt + FIGHT_GRACE_MS) return next
        return advance({ ...next, fight: { ...s.fight, done: true, error: 'The fight timed out.' } }, a.now, a.r)
      }
      if (s.phase === 'fighting' && s.fight?.done) return advance(next, a.now, a.r)
      return a.now >= s.endsAt ? advance(next, a.now, a.r) : next
    }
    case 'setup':
      if (s.armed || s.phase !== 'trading' || s.results.length > 0) return s
      return { ...s, setup: { ...s.setup, ...a.setup } }
    case 'arm':
      if (s.phase !== 'trading' || s.results.length > 0 || !s.config || !s.setup.task.trim() || s.setup.models.some((m) => !m)) return s
      return { ...s, armed: true, endsAt: a.bellNow ? a.now : Math.min(s.endsAt, a.now + ms(SEC.start)) }
    case 'fightMsg': {
      if (!s.fight || s.fight.key !== a.key) return s
      const fight = onFightMsg(s.fight, a.msg)
      return { ...s, fight }
    }
    case 'config': {
      const models: [string, string] = s.setup.models.some((m) => m) ? s.setup.models : a.config.defaults
      return { ...s, config: a.config, configError: null, setup: { ...s.setup, models } }
    }
    case 'configError':
      return { ...s, configError: a.message }
    case 'fightClosed':
      if (!s.fight || s.fight.key !== a.key || s.fight.done) return s
      return { ...s, fight: { ...s.fight, done: true, error: a.error ?? 'The fight stream closed early.' } }
    case 'crowdTrade': {
      if (s.phase !== 'trading') return s
      const { market } = buyInto(s, a.side, a.mon)
      const m = a.sell ? applyTrade(s.market, a.side, -quoteBuy(s.market, a.side, a.mon).shares * 0.5) : market
      return {
        ...s,
        market: m,
        points: [...s.points, { t: s.now, priceA: priceA(m) }],
        feed: pushFeed(s.feed, { at: s.now, who: a.who, side: a.side, isBuy: !a.sell, mon: a.mon, priceA: priceA(m) }),
      }
    }
    case 'crowdVote': {
      if (s.phase !== 'voting') return s
      const favoredLabel = (s.favored === 0) !== s.swapped ? 0 : 1
      const label = a.r < 0.58 ? favoredLabel : 1 - favoredLabel
      return { ...s, votes: label === 0 ? [s.votes[0] + 1, s.votes[1]] : [s.votes[0], s.votes[1] + 1] }
    }
    case 'buy': {
      if (s.phase !== 'trading' || a.mon < LIMITS.min || a.mon > LIMITS.max || a.mon > s.balance + 1e-9) return s
      const before = priceA(s.market)
      const { market, shares } = buyInto(s, a.side, a.mon)
      const pos: Position = {
        shares: a.side === 0 ? [s.pos.shares[0] + shares, s.pos.shares[1]] : [s.pos.shares[0], s.pos.shares[1] + shares],
        cost: a.side === 0 ? [s.pos.cost[0] + a.mon, s.pos.cost[1]] : [s.pos.cost[0], s.pos.cost[1] + a.mon],
        firstAt: a.side === 0 ? [s.pos.firstAt[0] ?? s.now, s.pos.firstAt[1]] : [s.pos.firstAt[0], s.pos.firstAt[1] ?? s.now],
        firstPrice:
          a.side === 0
            ? [s.pos.firstAt[0] === null ? before : s.pos.firstPrice[0], s.pos.firstPrice[1]]
            : [s.pos.firstPrice[0], s.pos.firstAt[1] === null ? 1 - before : s.pos.firstPrice[1]],
      }
      return {
        ...s,
        market,
        pos,
        balance: s.balance - a.mon,
        points: [...s.points, { t: s.now, priceA: priceA(market) }],
        feed: pushFeed(s.feed, { at: s.now, who: 'You', side: a.side, isBuy: true, mon: a.mon, priceA: priceA(market), mine: true }),
      }
    }
    case 'cashOut': {
      const shares = s.pos.shares[a.side]
      if (s.phase !== 'trading' || shares <= 0) return s
      const { proceeds } = quoteSell(s.market, a.side, shares)
      const market = applyTrade(s.market, a.side, -shares)
      const pos: Position = {
        shares: a.side === 0 ? [0, s.pos.shares[1]] : [s.pos.shares[0], 0],
        cost: a.side === 0 ? [0, s.pos.cost[1]] : [s.pos.cost[0], 0],
        firstAt: a.side === 0 ? [null, s.pos.firstAt[1]] : [s.pos.firstAt[0], null],
        firstPrice: s.pos.firstPrice,
      }
      return {
        ...s,
        market,
        pos,
        balance: s.balance + proceeds,
        points: [...s.points, { t: s.now, priceA: priceA(market) }],
        feed: pushFeed(s.feed, { at: s.now, who: 'You', side: a.side, isBuy: false, mon: proceeds, priceA: priceA(market), mine: true }),
      }
    }
    case 'vote': {
      const holds = s.pos.shares[0] > 0 || s.pos.shares[1] > 0
      if (s.phase !== 'voting' || s.myVote !== null || !holds || (a.label !== 0 && a.label !== 1)) return s
      return { ...s, myVote: a.label, votes: a.label === 0 ? [s.votes[0] + 1, s.votes[1]] : [s.votes[0], s.votes[1] + 1] }
    }
    case 'claim':
      if (s.phase !== 'final' || s.claimed || s.payout <= 0) return s
      return { ...s, claimed: true, balance: s.balance + s.payout }
  }
}

export function useMatch() {
  const [s, dispatch] = useReducer(reducer, null, () => fresh(Date.now()))

  useEffect(() => {
    const abort = new AbortController()
    fetchFightConfig(abort.signal).then(
      (config) => dispatch({ type: 'config', config }),
      (e: unknown) => {
        if (!abort.signal.aborted) dispatch({ type: 'configError', message: e instanceof Error ? e.message : String(e) })
      },
    )
    return () => abort.abort()
  }, [])

  useEffect(() => {
    const id = setInterval(() => dispatch({ type: 'tick', now: Date.now(), r: [Math.random(), Math.random()] }), 250)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (s.phase !== 'trading') return
    const id = setInterval(() => {
      // the crowd trades around fair value: the further the price drifts, the harder it pulls back
      const p = priceA(s.market)
      const side: Side = Math.random() < Math.min(0.9, Math.max(0.1, 0.5 + (s.fairA - p) * 2.5)) ? 0 : 1
      const mon = [0.05, 0.05, 0.1, 0.1, 0.15, 0.2, 0.3][Math.floor(Math.random() * 7)]!
      dispatch({ type: 'crowdTrade', side, mon, sell: Math.random() < 0.18, who: randomAddress() })
    }, 2600 / SPEED)
    return () => clearInterval(id)
  }, [s.phase, s.market, s.fairA])

  // AGENTS: each round is one real POST /api/fights (two paid LLM calls); keyed by round so re-renders never refire it
  const live = useRef<{ key: string; abort: AbortController } | null>(null)
  const fightK = s.fight?.key
  useEffect(() => {
    if (s.phase !== 'fighting' || !fightK) {
      live.current?.abort.abort()
      live.current = null
      return
    }
    if (live.current?.key === fightK) return
    const abort = new AbortController()
    live.current = { key: fightK, abort }
    const round = ROUNDS[s.results.length]!
    const prompt = `${s.setup.task.trim()}\n\nRound ${s.results.length + 1} of 3, "${round.name}": ${round.brief}`
    streamFight(
      { prompt, category: round.key, fighters: fightersOf(s).map((f) => ({ name: f.name, model: f.model })) },
      (msg) => dispatch({ type: 'fightMsg', key: fightK, msg }),
      abort.signal,
    )
      .then(() => dispatch({ type: 'fightClosed', key: fightK }))
      .catch((e: unknown) => {
        if (!abort.signal.aborted) dispatch({ type: 'fightClosed', key: fightK, error: e instanceof Error ? e.message : String(e) })
      })
  }, [s.phase, fightK, s.results.length, s.setup.task, s.setup.models, s.config])

  useEffect(() => {
    if (s.phase !== 'voting') return
    const id = setInterval(() => dispatch({ type: 'crowdVote', r: Math.random() }), 900 / SPEED)
    return () => clearInterval(id)
  }, [s.phase])

  const buy = useCallback((side: Side, mon: number) => dispatch({ type: 'buy', side, mon }), [])
  const cashOut = useCallback((side: Side) => dispatch({ type: 'cashOut', side }), [])
  const vote = useCallback((label: number) => dispatch({ type: 'vote', label }), [])
  const claim = useCallback(() => dispatch({ type: 'claim' }), [])
  const setSetup = useCallback((setup: Partial<MatchSetup>) => dispatch({ type: 'setup', setup }), [])
  const start = useCallback((bellNow = false) => dispatch({ type: 'arm', now: Date.now(), bellNow }), [])

  // once decided, the winner's shares are worth exactly 1 MON
  const fighters = useMemo(() => fightersFor(s.setup.models, s.config?.models ?? []), [s.setup.models, s.config])
  const price = s.phase === 'final' ? (s.wins[0] === 2 ? 1 : 0) : priceA(s.market)
  const secondsLeft = s.endsAt === Infinity ? SEC.start : Math.max(0, Math.ceil(((s.endsAt - s.now) * SPEED) / 1000))
  /** index of the round being fought / voted, or next up while trading */
  const roundIndex = Math.min(s.results.length, ROUNDS.length - 1)
  const stage = s.phase === 'final' ? 5 : s.phase === 'trading' && s.results.length === 0 ? 1 : s.results.length + 2

  const history: MarketHistory = useMemo(() => {
    const mainSide: Side = s.pos.shares[1] > s.pos.shares[0] ? 1 : 0
    const sh = s.pos.shares[mainSide]
    const at = s.pos.firstAt[mainSide]
    return {
      points: s.points,
      spans: s.spans,
      start: s.start,
      now: Math.max(s.now, s.start + 1000),
      stage,
      roundOdds: ROUND_ODDS,
      position:
        sh > 0 && at !== null ? { side: mainSide, shares: sh, paid: s.pos.cost[mainSide], at, price: s.pos.firstPrice[mainSide] } : null,
    }
  }, [s.points, s.spans, s.start, s.now, s.pos, stage])

  return {
    phase: s.phase,
    stage,
    roundIndex,
    secondsLeft,
    phaseLen: s.phaseLen,
    wins: s.wins,
    results: s.results,
    priceA: price,
    openingPriceA: matchOdds(ROUND_ODDS, 0, 0),
    history,
    balance: s.balance,
    shares: s.pos.shares,
    cost: s.pos.cost,
    holds: s.pos.shares[0] > 0 || s.pos.shares[1] > 0,
    feed: s.feed,
    tradingOpen: s.phase === 'trading',
    quoteBuy: (side: Side, mon: number) => quoteBuy(s.market, side, mon),
    quoteCashOut: (side: Side) => (s.pos.shares[side] > 0 ? quoteSell(s.market, side, s.pos.shares[side]).proceeds : 0),
    buy,
    cashOut,
    voting: { swapped: s.swapped, votes: s.votes, myVote: s.myVote },
    fight: s.fight,
    setup: s.setup,
    armed: s.armed,
    fighters,
    weightClass: matchClass(fighters),
    matchNo: s.matchNo,
    config: s.config,
    configError: s.configError,
    setSetup,
    start,
    now: s.now,
    vote,
    claimed: s.claimed,
    payout: s.payout,
    claim,
    winner: s.phase === 'final' ? (s.wins[0] === 2 ? 0 : 1) : null,
  }
}

export type Match = ReturnType<typeof useMatch>
