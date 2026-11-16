import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { formatEther } from 'viem'
import { useBalance } from 'wagmi'
import { EXPLORER_URL } from '@wab/shared'
import { EditProfileDialog } from '../components/EditProfileDialog'
import { Panel } from '../components/Panel'
import { avatarOf } from '../components/ProfileFields'
import { RobotBadge } from '../components/RobotBadge'
import { api, ApiError, type PublicUser } from '../wallet/api'
import { useAuth } from '../wallet/AuthProvider'
import { chain } from '../wallet/config'

const btn = 'btn-pixel flex min-h-11 cursor-pointer items-center px-4 font-display font-bold uppercase tracking-widest'
const joined = (ms: number) => new Date(ms).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

type Load = { id: string; state: 'ok'; user: PublicUser } | { id: string; state: 'missing' | 'error'; message?: string }

/** /me: your own profile, or a prompt to sign in. */
export function MyProfileRoute() {
  const auth = useAuth()
  if (auth.user) return <Navigate to={`/u/${auth.user.username}`} replace />
  if (auth.status === 'restoring') return <main className="mx-auto max-w-[1000px] px-4 py-10 text-lg text-mute">Loading…</main>
  return (
    <main className="mx-auto max-w-[1000px] px-4 pb-12">
      <section className="panel mt-6 flex flex-col items-center gap-4 p-10 text-center">
        <h1 className="steel text-4xl">Your profile</h1>
        <p className="max-w-md text-lg text-mute">Sign in with your wallet to see your profile. New here? Signing in starts the sign-up.</p>
        <button type="button" onClick={auth.signIn} className={`${btn} bg-ink text-white`}>
          Sign in
        </button>
      </section>
    </main>
  )
}

/** /u/:id where id is a username or wallet address. */
export function ProfilePage() {
  const { id = '' } = useParams()
  const auth = useAuth()
  const navigate = useNavigate()
  const [load, setLoad] = useState<Load | null>(null)
  const [editing, setEditing] = useState(false)
  const [copied, setCopied] = useState(false)

  const lower = id.toLowerCase()
  const isMe =
    !!auth.user && (lower === auth.user.username.toLowerCase() || lower === auth.user.address.toLowerCase())

  useEffect(() => {
    if (isMe) return
    const ctrl = new AbortController()
    api
      .user(id, ctrl.signal)
      .then((r) => setLoad({ id, state: 'ok', user: r.user }))
      .catch((e) => {
        if (ctrl.signal.aborted) return
        setLoad(e instanceof ApiError && e.status === 404 ? { id, state: 'missing' } : { id, state: 'error', message: e.message })
      })
    return () => ctrl.abort()
  }, [id, isMe])

  // Your own profile always shows live data, so edits appear immediately.
  const user: PublicUser | null = isMe ? auth.user : load?.id === id && load.state === 'ok' ? load.user : null

  // Keep the URL on the current username after a rename (or if it was opened by address).
  useEffect(() => {
    if (isMe && auth.user && id !== auth.user.username) navigate(`/u/${auth.user.username}`, { replace: true })
  }, [isMe, auth.user, id, navigate])

  const balance = useBalance({ address: user?.address, chainId: chain.id, query: { enabled: !!user, refetchInterval: 15_000 } })

  if (!user) {
    const failed = load?.id === id && load.state !== 'ok' ? load : null
    return (
      <main className="mx-auto max-w-[1000px] px-4 pb-12">
        <section className="panel mt-6 flex flex-col items-center gap-3 p-10 text-center" aria-busy={!failed}>
          {!failed ? (
            <p className="text-lg text-mute">Loading profile…</p>
          ) : failed.state === 'missing' ? (
            <>
              <h1 className="steel text-4xl">No one here</h1>
              <p className="text-lg text-mute">
                There's no WAB account called <span className="text-ink">{id}</span>.
              </p>
            </>
          ) : (
            <>
              <h1 className="steel text-4xl">Couldn't load profile</h1>
              <p className="text-lg text-red">{failed.message}</p>
            </>
          )}
          <Link to="/" className="label mt-2 flex min-h-11 items-center text-[11px] text-blue hover:underline">
            ◂ Back to the ring
          </Link>
        </section>
      </main>
    )
  }

  const avatar = avatarOf(user.avatar)
  const mon = balance.data ? Number(formatEther(balance.data.value)) : null

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(user!.address)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked; the full address is still selectable */
    }
  }

  return (
    <main className="mx-auto max-w-[1000px] px-4 pb-12">
      <Link to="/" className="label flex min-h-11 items-center text-[11px] text-blue hover:underline">
        ◂ Back to the ring
      </Link>

      <section aria-labelledby="profile-name" className="panel edge-light mt-2 flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
        <div className="shrink-0 self-center border-2 p-2" style={{ borderColor: avatar.primary }}>
          <RobotBadge brand={avatar} size={128} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 id="profile-name" className="steel break-all text-4xl sm:text-5xl">
              {user.username}
            </h1>
            {isMe && <span className="label border-2 border-ink px-2 py-0.5 text-[10px] text-ink">You</span>}
          </div>
          <p className="mt-1 text-lg text-mute">In the club since {joined(user.createdAt)}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
            <code className="break-all font-mono text-sm text-ink" title="Wallet address">
              {user.address}
            </code>
            <button type="button" onClick={copyAddress} className="label min-h-11 cursor-pointer text-[11px] text-mute hover:text-ink">
              {copied ? 'Copied ✓' : 'Copy'}
            </button>
            <a
              href={`${EXPLORER_URL}/address/${user.address}`}
              target="_blank"
              rel="noreferrer"
              className="label flex min-h-11 items-center text-[11px] text-blue hover:underline"
            >
              MonadVision ↗
            </a>
          </div>
        </div>
        {isMe && (
          <div className="flex gap-3 sm:flex-col">
            <button type="button" onClick={() => setEditing(true)} className={`${btn} flex-1 justify-center bg-ink text-white`}>
              Edit profile
            </button>
            <button
              type="button"
              onClick={() => void auth.signOut().then(() => navigate('/'))}
              className={`${btn} flex-1 justify-center border-2 border-line text-red hover:border-red`}
            >
              Sign out
            </button>
          </div>
        )}
      </section>

      <div className="mt-5 grid gap-5 md:grid-cols-[1fr_2fr]">
        <Panel title="Wallet" titleId="wallet-title">
          <p className="font-display text-4xl tabular-nums">
            <span className="text-gold">◆</span>{' '}
            {mon === null ? (balance.isError ? '—' : '…') : mon.toLocaleString(undefined, { maximumFractionDigits: 4 })}{' '}
            <span className="text-2xl text-mute">MON</span>
          </p>
          <p className="mt-1 text-base text-mute">
            {balance.isError ? "Couldn't read the balance from Monad." : 'Live from Monad testnet. Play money, no real value.'}
          </p>
        </Panel>

        <Panel title="Fight record" titleId="record-title">
          <p className="text-lg text-mute">
            {isMe ? 'No bets yet. Back a fighter in the ring and your record shows up here.' : `${user.username} hasn't placed a bet yet.`}
          </p>
          {isMe && (
            <Link to="/" className={`${btn} mt-4 w-fit bg-ink text-white`}>
              Go to the ring
            </Link>
          )}
        </Panel>
      </div>

      {editing && <EditProfileDialog onClose={() => setEditing(false)} />}
    </main>
  )
}
