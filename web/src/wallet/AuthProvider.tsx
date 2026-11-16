import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createSiweMessage } from 'viem/siwe'
import { useAccount, useConnect, useDisconnect, useSignMessage, useSwitchChain } from 'wagmi'
import { TERMS_VERSION, type AvatarId } from '@wab/shared'
import { api, ApiError, type User } from './api'
import { chain } from './config'

const TOKEN_KEY = 'wab.session'

type Status = 'restoring' | 'signedOut' | 'connecting' | 'signing' | 'needsSignup' | 'signedIn'

export type NewProfile = { username: string; avatar: AvatarId; ageConfirmed: boolean; termsAccepted: boolean }

type AuthState = {
  status: Status
  user: User | null
  /** Wallet that signed in but has no account yet; the sign-up form is shown for it. */
  pendingAddress: `0x${string}` | null
  error: string | null
  hasWallet: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  /** Finishes sign-up. Throws ApiError so the form can show the reason. */
  signUp: (profile: NewProfile) => Promise<void>
  cancelSignUp: () => Promise<void>
  updateProfile: (patch: { username?: string; avatar?: AvatarId }) => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthState | null>(null)

const readToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}
const writeToken = (t: string | null) => {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* private mode: session lasts for this tab only */
  }
}

function describe(err: unknown): string {
  const chainOf = (e: unknown): unknown[] => (e && typeof e === 'object' ? [e, ...chainOf((e as { cause?: unknown }).cause)] : [])
  const all = chainOf(err) as { name?: string; code?: number; shortMessage?: string; message?: string }[]
  if (all.some((e) => e.name === 'UserRejectedRequestError' || e.code === 4001)) return 'Request cancelled in your wallet.'
  if (all.some((e) => e.code === -32002)) return 'MetaMask already has a request open. Check the extension.'
  if (err instanceof ApiError) return err.message
  return all[0]?.shortMessage ?? all[0]?.message ?? 'Something went wrong.'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const account = useAccount()
  const { connectors, connectAsync } = useConnect()
  const { disconnectAsync } = useDisconnect()
  const { switchChainAsync } = useSwitchChain()
  const { signMessageAsync } = useSignMessage()

  const [token, setToken] = useState<string | null>(readToken)
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<Status>(token ? 'restoring' : 'signedOut')
  const [pending, setPending] = useState<{ signupToken: string; address: `0x${string}` } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const hasWallet = typeof window !== 'undefined' && ('ethereum' in window || connectors.length > 1)

  const dropSession = useCallback(() => {
    writeToken(null)
    setToken(null)
    setUser(null)
    setPending(null)
    setStatus('signedOut')
  }, [])

  // Restore a saved session on load.
  useEffect(() => {
    if (!token || user) return
    let live = true
    api
      .me(token)
      .then((r) => {
        if (!live) return
        setUser(r.user)
        setStatus('signedIn')
      })
      .catch((e) => {
        if (!live) return
        if (e instanceof ApiError && e.status === 401) dropSession()
        else setStatus('signedOut')
      })
    return () => {
      live = false
    }
  }, [token, user, dropSession])

  // Switching accounts in MetaMask signs you out (or abandons sign-up), so bets never go
  // from a wallet you didn't sign in with.
  useEffect(() => {
    const owner = user?.address ?? pending?.address
    if (owner && account.status === 'connected' && account.address && account.address !== owner) {
      if (token) api.logout(token).catch(() => {})
      dropSession()
    }
  }, [account.status, account.address, user, pending, token, dropSession])

  const signIn = useCallback(async () => {
    setError(null)
    try {
      setStatus('connecting')
      let address = account.address
      let chainId = account.chainId
      if (account.status !== 'connected' || !address) {
        const connector = connectors.find((c) => c.id === 'io.metamask') ?? connectors.find((c) => c.type === 'injected')
        if (!connector) throw new Error('No browser wallet found. Install MetaMask to continue.')
        const r = await connectAsync({ connector, chainId: chain.id })
        address = r.accounts[0]
        chainId = r.chainId
      }
      if (chainId !== chain.id) await switchChainAsync({ chainId: chain.id })

      setStatus('signing')
      const { nonce } = await api.nonce()
      const message = createSiweMessage({
        address: address!,
        chainId: chain.id,
        domain: window.location.host,
        uri: window.location.origin,
        version: '1',
        nonce,
        issuedAt: new Date(),
        statement: 'Sign in to WAB. This only proves you own this wallet. It costs nothing and sends no transaction.',
      })
      const signature = await signMessageAsync({ message, account: address })
      const res = await api.verify(message, signature)

      if (res.status === 'needsSignup') {
        setPending({ signupToken: res.signupToken, address: res.address })
        setStatus('needsSignup')
        return
      }
      writeToken(res.token)
      setToken(res.token)
      setUser(res.user)
      setStatus('signedIn')
    } catch (e) {
      setError(describe(e))
      setStatus(user ? 'signedIn' : 'signedOut')
      setPending(null)
    }
  }, [account.address, account.chainId, account.status, connectors, connectAsync, switchChainAsync, signMessageAsync, user])

  const signOut = useCallback(async () => {
    if (token) await api.logout(token).catch(() => {})
    dropSession()
    await disconnectAsync().catch(() => {})
  }, [token, dropSession, disconnectAsync])

  const signUp = useCallback(
    async (profile: NewProfile) => {
      if (!pending) throw new ApiError(401, 'Sign in with your wallet first.')
      const res = await api.signup({ ...profile, signupToken: pending.signupToken, termsVersion: TERMS_VERSION })
      writeToken(res.token)
      setToken(res.token)
      setUser(res.user)
      setPending(null)
      setStatus('signedIn')
    },
    [pending],
  )

  const cancelSignUp = useCallback(async () => {
    dropSession()
    await disconnectAsync().catch(() => {})
  }, [dropSession, disconnectAsync])

  const updateProfile = useCallback(
    async (patch: { username?: string; avatar?: AvatarId }) => {
      if (!token) throw new ApiError(401, 'Sign in first.')
      const r = await api.updateProfile(token, patch)
      setUser(r.user)
    },
    [token],
  )

  const value = useMemo<AuthState>(
    () => ({
      status,
      user,
      pendingAddress: pending?.address ?? null,
      error,
      hasWallet,
      signIn,
      signOut,
      signUp,
      cancelSignUp,
      updateProfile,
      clearError: () => setError(null),
    }),
    [status, user, pending, error, hasWallet, signIn, signOut, signUp, cancelSignUp, updateProfile],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
