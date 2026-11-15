import { useEffect, useState } from 'react'
import { AVATARS, USERNAME_HELP, usernameProblem, type AvatarId } from '@wab/shared'
import { api } from '../wallet/api'
import { RobotBadge } from './RobotBadge'

export type NameCheck = { state: 'idle' | 'checking' | 'ok' | 'bad'; message: string }

/** Validates locally, then asks the server whether the name is free (debounced). */
export function useUsernameCheck(name: string, current?: string): NameCheck {
  const trimmed = name.trim()
  const local = trimmed ? usernameProblem(trimmed) : null
  const unchanged = !!current && trimmed.toLowerCase() === current.toLowerCase()
  const [remote, setRemote] = useState<{ name: string; available: boolean; reason?: string } | null>(null)

  useEffect(() => {
    if (!trimmed || local || unchanged) return
    const ctrl = new AbortController()
    const t = setTimeout(() => {
      api
        .usernameStatus(trimmed, ctrl.signal)
        .then((r) => setRemote({ name: trimmed, ...r }))
        .catch(() => {})
    }, 350)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [trimmed, local, unchanged])

  if (!trimmed) return { state: 'idle', message: USERNAME_HELP }
  if (local) return { state: 'bad', message: local }
  if (unchanged) return { state: 'ok', message: 'Your current name.' }
  if (remote?.name !== trimmed) return { state: 'checking', message: 'Checking…' }
  return remote.available ? { state: 'ok', message: 'Name is free.' } : { state: 'bad', message: remote.reason ?? 'Not available.' }
}

export function UsernameField({ value, onChange, check }: { value: string; onChange: (v: string) => void; check: NameCheck }) {
  const color = check.state === 'bad' ? 'text-red' : check.state === 'ok' ? 'text-green' : 'text-mute'
  return (
    <div>
      <label htmlFor="username" className="label block text-[11px] text-mute">
        Username
      </label>
      <input
        id="username"
        autoFocus
        autoComplete="off"
        spellCheck={false}
        maxLength={20}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby="username-help"
        aria-invalid={check.state === 'bad'}
        className="mt-2 w-full border-2 border-line bg-night px-3 py-2 font-display text-2xl tracking-wider outline-none focus:border-ink aria-invalid:border-red"
      />
      <p id="username-help" aria-live="polite" className={`mt-1 text-lg ${color}`}>
        {check.message}
      </p>
    </div>
  )
}

export function AvatarPicker({ value, onChange }: { value: AvatarId; onChange: (v: AvatarId) => void }) {
  return (
    <fieldset>
      <legend className="label text-[11px] text-mute">Avatar</legend>
      <div role="radiogroup" className="mt-2 grid grid-cols-4 gap-2">
        {AVATARS.map((a) => {
          const on = a.id === value
          return (
            <label
              key={a.id}
              className={`flex cursor-pointer flex-col items-center border-2 py-2 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-blue ${
                on ? 'border-ink bg-well' : 'border-line hover:border-mute'
              }`}
            >
              <input type="radio" name="avatar" value={a.id} checked={on} onChange={() => onChange(a.id)} className="sr-only" />
              <RobotBadge brand={a} size={48} />
              <span className={`label mt-1 text-[10px] ${on ? 'text-ink' : 'text-mute'}`}>{a.label}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

export const avatarOf = (id: AvatarId) => AVATARS.find((a) => a.id === id) ?? AVATARS[0]
