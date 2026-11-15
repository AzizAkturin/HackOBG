import { useCallback, useEffect, useState } from 'react'
import { crowdAmounts, mainEvent, RAKE, randomAddress } from '../data/mock'

export interface FeedItem {
  key: number
  who: string
  fighter: number
  amount: number
  mine?: boolean
}

export interface MyBet {
  key: number
  fighter: number
  amount: number
}

export const FIGHT_SEC = 24
const REST_SEC = 4
export const VOTE_SEC = 30
export const REVEAL_SEC = 14
const ROUND_END = FIGHT_SEC + REST_SEC + VOTE_SEC + REVEAL_SEC

export type Phase = 'betting' | 'fighting' | 'rest' | 'voting' | 'reveal'

export interface Result {
  winner: number
  /** votes per fighter index */
  votes: number[]
  myStake: number
  payout: number
}

let feedKey = 0

const shuffled = (n: number) => {
  const a = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Local simulation of one round: betting, the fight, blind A/B voting, then the reveal and payout.
 * Swap for chain reads (Entered and Voted logs) once the contract exists.
 */
export function useRound() {
  const n = mainEvent.fighters.length
  const [pools, setPools] = useState(() => mainEvent.fighters.map((f) => f.pool))
  const [backers, setBackers] = useState(() => mainEvent.fighters.map((f) => f.backers))
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [myBets, setMyBets] = useState<MyBet[]>([])
  const [secondsLeft, setSecondsLeft] = useState(mainEvent.locksInSec)
  const [balance, setBalance] = useState(1)
  /** labelToFighter[label] is the fighter behind "Response A", "Response B", ... */
  const [labelToFighter, setLabelToFighter] = useState(() => shuffled(n))
  const [labelVotes, setLabelVotes] = useState<number[]>(() => Array(n).fill(0))
  const [myVote, setMyVote] = useState<number | null>(null)
  const [result, setResult] = useState<Result | null>(null)

  const t = -secondsLeft
  const locked = secondsLeft <= 0
  const phase: Phase = !locked
    ? 'betting'
    : t < FIGHT_SEC
      ? 'fighting'
      : t < FIGHT_SEC + REST_SEC
        ? 'rest'
        : t < FIGHT_SEC + REST_SEC + VOTE_SEC
          ? 'voting'
          : 'reveal'
  const voteSecondsLeft = FIGHT_SEC + REST_SEC + VOTE_SEC - t
  const total = pools.reduce((a, b) => a + b, 0)

  const addBet = useCallback((fighter: number, amount: number, who: string, mine = false) => {
    setPools((p) => p.map((v, i) => (i === fighter ? v + amount : v)))
    setBackers((b) => b.map((v, i) => (i === fighter ? v + 1 : v)))
    setFeed((f) => [{ key: ++feedKey, who, fighter, amount, mine }, ...f].slice(0, 8))
  }, [])

  useEffect(() => {
    let s = mainEvent.locksInSec
    const id = setInterval(() => {
      s = s > -(ROUND_END - 1) ? s - 1 : mainEvent.locksInSec
      setSecondsLeft(s)
      if (s !== mainEvent.locksInSec) return
      setPools(mainEvent.fighters.map((f) => f.pool))
      setBackers(mainEvent.fighters.map((f) => f.backers))
      setFeed([])
      setMyBets([])
      setLabelToFighter(shuffled(n))
      setLabelVotes(Array(n).fill(0))
      setMyVote(null)
      setResult(null)
    }, 1000)
    return () => clearInterval(id)
  }, [n])

  useEffect(() => {
    if (locked) return
    const id = setInterval(() => {
      const fighter = Math.floor(Math.random() * n)
      const amount = crowdAmounts[Math.floor(Math.random() * crowdAmounts.length)]
      addBet(fighter, amount, randomAddress())
    }, 2200)
    return () => clearInterval(id)
  }, [locked, n, addBet])

  useEffect(() => {
    if (phase !== 'voting') return
    const id = setInterval(() => {
      // the crowd leans slightly toward the judge's pick so mock rounds have a winner
      const favored = labelToFighter.indexOf(mainEvent.judgeRank[0])
      const label = Math.random() < 0.56 ? favored : Math.floor(Math.random() * n)
      setLabelVotes((v) => v.map((c, i) => (i === label ? c + 1 : c)))
    }, 650)
    return () => clearInterval(id)
  }, [phase, labelToFighter, n])

  useEffect(() => {
    if (phase !== 'reveal' || result) return
    const votes = Array<number>(n).fill(0)
    labelVotes.forEach((c, label) => (votes[labelToFighter[label]] = c))
    const top = Math.max(...votes)
    const winner = mainEvent.judgeRank.find((f) => votes[f] === top) ?? 0
    const pot = pools.reduce((a, b) => a + b, 0) * (1 - RAKE)
    const myStake = myBets.filter((b) => b.fighter === winner).reduce((a, b) => a + b.amount, 0)
    const payout = myStake > 0 ? (pot * myStake) / pools[winner] : 0
    if (payout > 0) setBalance((b) => +(b + payout).toFixed(4))
    setResult({ winner, votes, myStake, payout })
  }, [phase, result, n, pools, labelVotes, labelToFighter, myBets])

  /** Decimal odds if the pool stayed as it is now. */
  const odds = (i: number) => (pools[i] > 0 ? (total * (1 - RAKE)) / pools[i] : 0)

  /** What a new stake on fighter i would return if that fighter wins. */
  const payoutFor = (i: number, amount: number) =>
    amount > 0 ? ((total + amount) * (1 - RAKE) * amount) / (pools[i] + amount) : 0

  const placeBet = (fighter: number, amount: number) => {
    if (locked || amount <= 0 || amount > balance) return false
    setBalance((b) => +(b - amount).toFixed(4))
    setMyBets((m) => [...m, { key: ++feedKey, fighter, amount }])
    addBet(fighter, amount, 'You', true)
    return true
  }

  const castVote = (label: number) => {
    if (phase !== 'voting' || myVote !== null) return false
    setMyVote(label)
    setLabelVotes((v) => v.map((c, i) => (i === label ? c + 1 : c)))
    return true
  }

  return {
    pools,
    backers,
    total,
    feed,
    myBets,
    secondsLeft,
    locked,
    phase,
    balance,
    odds,
    payoutFor,
    placeBet,
    labelToFighter,
    labelVotes,
    myVote,
    voteSecondsLeft,
    castVote,
    result,
  }
}

export type Round = ReturnType<typeof useRound>
