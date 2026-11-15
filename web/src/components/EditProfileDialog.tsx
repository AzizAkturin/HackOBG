import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { AvatarId } from '@wab/shared'
import { useAuth } from '../wallet/AuthProvider'
import { AvatarPicker, UsernameField, useUsernameCheck } from './ProfileFields'

const btn = 'btn-pixel min-h-11 cursor-pointer px-4 font-display font-bold uppercase tracking-widest disabled:cursor-wait disabled:opacity-70'

/** Edit the signed-in user's username and avatar. */
export function EditProfileDialog({ onClose }: { onClose: () => void }) {
  const auth = useAuth()
  const ref = useRef<HTMLDialogElement>(null)
  const current = auth.user!
  const [username, setUsername] = useState(current.username)
  const [avatar, setAvatar] = useState<AvatarId>(current.avatar)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const check = useUsernameCheck(username, current.username)

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  const changed = username.trim() !== current.username || avatar !== current.avatar
  const ready = changed && check.state === 'ok' && !saving

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!ready) return
    setSaving(true)
    setError(null)
    try {
      await auth.updateProfile({
        ...(username.trim() !== current.username && { username: username.trim() }),
        ...(avatar !== current.avatar && { avatar }),
      })
      ref.current?.close()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.')
      setSaving(false)
    }
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="profile-title"
      className="panel m-auto max-h-[calc(100dvh-2rem)] w-[min(100%-2rem,32rem)] overflow-y-auto p-6 text-ink backdrop:bg-night/80"
    >
      <form onSubmit={submit} className="flex flex-col gap-5">
        <h2 id="profile-title" className="steel text-3xl">
          Your profile
        </h2>
        <UsernameField value={username} onChange={setUsername} check={check} />
        <AvatarPicker value={avatar} onChange={setAvatar} />
        {error && (
          <p role="alert" className="text-lg text-red">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <button type="button" onClick={() => ref.current?.close()} className={`${btn} flex-1 border-2 border-line text-mute hover:text-ink`}>
            Cancel
          </button>
          <button type="submit" disabled={!ready} className={`${btn} flex-1 bg-gold text-night hover:bg-ink disabled:cursor-not-allowed disabled:opacity-50`}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
