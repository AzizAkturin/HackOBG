import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AVATARS, TERMS, type AvatarId } from '@wab/shared'
import { useAuth } from '../wallet/AuthProvider'
import { AvatarPicker, UsernameField, useUsernameCheck } from './ProfileFields'

const btn = 'btn-pixel min-h-12 cursor-pointer px-4 font-display font-bold uppercase tracking-widest'
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`

/** Shown after a wallet with no account signs in. No account exists until this is submitted. */
export function SignUpDialog() {
  const auth = useAuth()
  const ref = useRef<HTMLDialogElement>(null)
  const [username, setUsername] = useState('')
  const [avatar, setAvatar] = useState<AvatarId>(() => AVATARS[Math.floor(Math.random() * AVATARS.length)]!.id)
  const [adult, setAdult] = useState(false)
  const [terms, setTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const check = useUsernameCheck(username)

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  const ready = check.state === 'ok' && adult && terms && !saving

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!ready) return
    setSaving(true)
    setError(null)
    try {
      await auth.signUp({ username: username.trim(), avatar, ageConfirmed: adult, termsAccepted: terms })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the account.')
      setSaving(false)
    }
  }

  return (
    <dialog
      ref={ref}
      // Escape or Cancel abandons sign-up; nothing was created.
      onCancel={(e) => {
        e.preventDefault()
        void auth.cancelSignUp()
      }}
      aria-labelledby="signup-title"
      className="panel m-auto max-h-[calc(100dvh-2rem)] w-[min(100%-2rem,32rem)] overflow-y-auto p-6 text-ink backdrop:bg-night/85"
    >
      <form onSubmit={submit} className="flex flex-col gap-5">
        <header>
          <h2 id="signup-title" className="steel text-4xl">
            Create your account
          </h2>
          <p className="mt-1 text-lg text-mute">
            Wallet <span className="font-mono text-ink">{auth.pendingAddress && short(auth.pendingAddress)}</span> is verified. Set up
            your profile to join the club.
          </p>
        </header>

        <UsernameField value={username} onChange={setUsername} check={check} />
        <AvatarPicker value={avatar} onChange={setAvatar} />

        <div className="flex flex-col gap-3 border-2 border-dashed border-line p-3">
          <ul className="list-disc pl-5 text-base text-mute">
            {TERMS.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <Check checked={terms} onChange={setTerms}>
            I understand and accept these terms.
          </Check>
          <Check checked={adult} onChange={setAdult}>
            I am 18 or older.
          </Check>
        </div>

        {error && (
          <p role="alert" className="text-lg text-red">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={() => void auth.cancelSignUp()} className={`${btn} border-2 border-line text-mute hover:text-ink`}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={!ready}
            className={`${btn} flex-1 bg-gold text-night hover:bg-ink disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {saving ? 'Creating…' : 'Create account'}
          </button>
        </div>
      </form>
    </dialog>
  )
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: string }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-lg">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 accent-gold" />
      {children}
    </label>
  )
}
