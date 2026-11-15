import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../wallet/AuthProvider'
import { EditProfileDialog } from './EditProfileDialog'
import { avatarOf } from './ProfileFields'
import { RobotBadge } from './RobotBadge'
import { SignUpDialog } from './SignUpDialog'

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`
// Sized for the slim black nav bar in TopBar.
const btn =
  'flex h-[26px] cursor-pointer items-center px-3 font-display text-[13px] font-bold uppercase tracking-wider disabled:cursor-wait disabled:opacity-70'

export function AccountButton() {
  const auth = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [menuOpen])

  if (!auth.user) {
    const busy = auth.status === 'connecting' || auth.status === 'signing' || auth.status === 'restoring' || auth.status === 'needsSignup'
    const label =
      auth.status === 'connecting'
        ? 'Connecting…'
        : auth.status === 'signing'
          ? 'Check wallet…'
          : auth.status === 'needsSignup'
            ? 'Signing up…'
            : auth.status === 'restoring'
              ? '…'
              : 'Sign in'
    return (
      <div className="relative">
        {auth.hasWallet ? (
          <button type="button" onClick={auth.signIn} disabled={busy} className={`${btn} bg-[#d00] text-white hover:bg-white hover:text-[#121212]`}>
            {label}
          </button>
        ) : (
          <a
            href={`https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`}
            target="_blank"
            rel="noreferrer"
            className={`${btn} bg-[#d00] text-white hover:bg-white hover:text-[#121212]`}
          >
            Get MetaMask
          </a>
        )}
        {auth.error && (
          <div role="alert" className="panel absolute right-0 top-full z-50 mt-2 w-72 p-3 text-base">
            <p className="text-red">{auth.error}</p>
            <button type="button" onClick={auth.clearError} className="label mt-2 cursor-pointer text-[11px] text-mute hover:text-ink">
              Dismiss
            </button>
          </div>
        )}
        {auth.status === 'needsSignup' && <SignUpDialog />}
      </div>
    )
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((o) => !o)}
        className={`${btn} gap-2 pl-1 text-white hover:bg-white/10`}
      >
        <RobotBadge brand={avatarOf(auth.user.avatar)} size={24} />
        <span className="max-w-[10ch] truncate sm:max-w-none">{auth.user.username}</span>
      </button>
      {menuOpen && (
        <div role="menu" className="panel absolute right-0 top-full z-50 mt-2 w-64 p-2">
          <p className="px-2 py-1 font-mono text-sm text-mute" title={auth.user.address}>
            {short(auth.user.address)}
          </p>
          <Link
            role="menuitem"
            to={`/u/${auth.user.username}`}
            onClick={() => setMenuOpen(false)}
            className="label flex min-h-11 w-full items-center px-2 text-left text-[11px] hover:text-gold"
          >
            My profile
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setMenuOpen(false)
              setEditOpen(true)
            }}
            className="label flex min-h-11 w-full cursor-pointer items-center px-2 text-left text-[11px] hover:text-gold"
          >
            Edit profile
          </button>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setMenuOpen(false)
              void auth.signOut()
            }}
            className="label flex min-h-11 w-full cursor-pointer items-center px-2 text-left text-[11px] text-red hover:text-ink"
          >
            Sign out
          </button>
        </div>
      )}
      {editOpen && <EditProfileDialog onClose={() => setEditOpen(false)} />}
    </div>
  )
}
