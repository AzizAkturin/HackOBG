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

/** Seconds of fighting after the bell, then seconds resting in the corners. */
export const FIGHT_SEC = 24
const REST_SEC = 9

export type Phase = 'betting' | 'fighting' | 'rest'

let feedKey = 0

/**
 * Local simulation of one parimutuel round: pools, a fake crowd betting,
 * and a countdown that loops so the demo never goes stale.
 * Swap for chain reads (Entered logs) once the contract exists.
 */
export function useRound() {
  const n = mainEvent.fighters.length
  const [pools, setPools] = useState(() => mainEvent.fighters.map((f) => f.pool))
  const [backers, setBackers] = useState(() => mainEvent.fighters.map((f) => f.backers))
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [myBets, setMyBets] = useState<MyBet[]>([])
  const [secondsLeft, setSecondsLeft] = useState(mainEvent.locksInSec)
  const [balance, setBalance] = useState(1)

  const locked = secondsLeft <= 0
  const phase: Phase = !locked ? 'betting' : -secondsLeft < FIGHT_SEC ? 'fighting' : 'rest'
  const total = pools.reduce((a, b) => a + b, 0)

  const addBet = useCallback((fighter: number, amount: number, who: string, mine = false) => {
    setPools((p) => p.map((v, i) => (i === fighter ? v + amount : v)))
    setBackers((b) => b.map((v, i) => (i === fighter ? v + 1 : v)))
    setFeed((f) => [{ key: ++feedKey, who, fighter, amount, mine }, ...f].slice(0, 8))
  }, [])

  useEffect(() => {
    const t = setInterval(() => {
      setSecondsLeft((s) => (s <= -(FIGHT_SEC + REST_SEC) ? mainEvent.locksInSec : s - 1))
    }, 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (locked) return
    const t = setInterval(() => {
      const fighter = Math.floor(Math.random() * n)
      const amount = crowdAmounts[Math.floor(Math.random() * crowdAmounts.length)]
      addBet(fighter, amount, randomAddress())
    }, 2200)
    return () => clearInterval(t)
  }, [locked, n, addBet])

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

  return { pools, backers, total, feed, myBets, secondsLeft, locked, phase, balance, odds, payoutFor, placeBet }
}

export type Round = ReturnType<typeof useRound>
