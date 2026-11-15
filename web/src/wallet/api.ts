export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8787'

import type { AvatarId } from '@wab/shared'

export type User = {
  address: `0x${string}`
  username: string
  avatar: AvatarId
  createdAt: number
  lastLoginAt: number
}

export type PublicUser = Pick<User, 'address' | 'username' | 'avatar' | 'createdAt'>

export type SignInResult =
  | { status: 'signedIn'; token: string; user: User }
  | { status: 'needsSignup'; signupToken: string; address: `0x${string}` }

export type SignUpInput = {
  signupToken: string
  username: string
  avatar: AvatarId
  ageConfirmed: boolean
  termsAccepted: boolean
  termsVersion: string
}

export class ApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function call<T>(path: string, init: RequestInit & { token?: string | null } = {}): Promise<T> {
  const { token, ...rest } = init
  const headers = new Headers(rest.headers)
  if (rest.body) headers.set('content-type', 'application/json')
  if (token) headers.set('authorization', `Bearer ${token}`)
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, { ...rest, headers })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    throw new ApiError(0, "Can't reach the WAB server. Is it running?")
  }
  if (res.status === 204) return undefined as T
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, body.error ?? `request failed (${res.status})`)
  return body as T
}

export const api = {
  nonce: () => call<{ nonce: string }>('/api/auth/nonce'),
  verify: (message: string, signature: string) =>
    call<SignInResult>('/api/auth/verify', { method: 'POST', body: JSON.stringify({ message, signature }) }),
  signup: (input: SignUpInput) =>
    call<{ token: string; user: User }>('/api/auth/signup', { method: 'POST', body: JSON.stringify(input) }),
  usernameStatus: (name: string, signal?: AbortSignal) =>
    call<{ available: boolean; reason?: string }>(`/api/auth/username?name=${encodeURIComponent(name)}`, { signal }),
  me: (token: string) => call<{ user: User }>('/api/me', { token }),
  updateProfile: (token: string, patch: { username?: string; avatar?: AvatarId }) =>
    call<{ user: User }>('/api/me', { method: 'PATCH', token, body: JSON.stringify(patch) }),
  /** Look up a profile by wallet address or username. */
  user: (id: string, signal?: AbortSignal) => call<{ user: PublicUser }>(`/api/users/${encodeURIComponent(id)}`, { signal }),
  logout: (token: string) => call<void>('/api/auth/logout', { method: 'POST', token }),
}
