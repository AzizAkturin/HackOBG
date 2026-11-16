import { createHash, randomBytes } from "node:crypto";
import { getAddress, isAddress, verifyMessage, type Hex } from "viem";
import { generateSiweNonce, parseSiweMessage, validateSiweMessage } from "viem/siwe";
import { isAvatarId, TERMS_VERSION, usernameProblem, type AvatarId } from "@wab/shared";
import type { Db } from "../db/index.ts";

export const NONCE_TTL_MS = 10 * 60 * 1000;
export const SIGNUP_TTL_MS = 15 * 60 * 1000;
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type User = {
  address: string;
  username: string;
  avatar: AvatarId;
  createdAt: number;
  lastLoginAt: number;
};

export type PublicUser = Pick<User, "address" | "username" | "avatar" | "createdAt">;

type UserRow = { address: string; username: string; avatar: AvatarId; created_at: number; last_login_at: number };

export type SignInResult =
  | { status: "signedIn"; token: string; user: User }
  | { status: "needsSignup"; signupToken: string; address: string };

export type SignUpInput = {
  signupToken: string;
  username: string;
  avatar: string;
  ageConfirmed: boolean;
  termsAccepted: boolean;
  termsVersion: string;
};

export class AuthError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type AuthOptions = {
  /** Host the SIWE message must be signed for, e.g. "localhost:5173". */
  domain: string;
  chainId: number;
  now?: () => number;
};

const toUser = (r: UserRow): User => ({
  address: r.address,
  username: r.username,
  avatar: r.avatar,
  createdAt: r.created_at,
  lastLoginAt: r.last_login_at,
});

export const toPublic = (u: User): PublicUser => ({
  address: u.address,
  username: u.username,
  avatar: u.avatar,
  createdAt: u.createdAt,
});

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const newToken = () => randomBytes(32).toString("base64url");
const isUnique = (e: unknown, column: string) => String(e).includes("UNIQUE") && String(e).includes(column);

export function createAccounts(db: Db, opts: AuthOptions) {
  const now = opts.now ?? Date.now;

  const getUser = (address: string): User | null => {
    if (!isAddress(address, { strict: false })) return null;
    const row = db.prepare("SELECT * FROM users WHERE address = ?").get(getAddress(address)) as UserRow | undefined;
    return row ? toUser(row) : null;
  };

  const getUserByName = (username: string): User | null => {
    const row = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as UserRow | undefined;
    return row ? toUser(row) : null;
  };

  /** Profile lookup for URLs: accepts a wallet address or a username. */
  const findUser = (id: string): User | null => (isAddress(id, { strict: false }) ? getUser(id) : getUserByName(id));

  const openSession = (address: string, t: number) => {
    const token = newToken();
    db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(t);
    db.prepare("INSERT INTO sessions (token_hash, address, created_at, expires_at) VALUES (?, ?, ?, ?)").run(
      sha256(token),
      address,
      t,
      t + SESSION_TTL_MS,
    );
    return token;
  };

  function issueNonce(): string {
    const t = now();
    db.prepare("DELETE FROM auth_nonces WHERE expires_at <= ?").run(t);
    const nonce = generateSiweNonce();
    db.prepare("INSERT INTO auth_nonces (nonce, expires_at) VALUES (?, ?)").run(nonce, t + NONCE_TTL_MS);
    return nonce;
  }

  /**
   * Verifies a signed SIWE message. Wallets with an account get a session.
   * Wallets without one get a short-lived sign-up token; no account is created here.
   */
  async function signIn(message: string, signature: Hex): Promise<SignInResult> {
    const t = now();
    const parsed = parseSiweMessage(message);
    if (!parsed.address || !parsed.nonce) throw new AuthError(400, "malformed sign-in message");
    if (parsed.chainId !== opts.chainId) throw new AuthError(400, `sign-in must be for chain ${opts.chainId}`);
    if (!validateSiweMessage({ message: parsed, domain: opts.domain, time: new Date(t) })) {
      throw new AuthError(401, "sign-in message is expired or for another site");
    }

    let valid = false;
    try {
      valid = await verifyMessage({ address: parsed.address, message, signature });
    } catch {
      valid = false;
    }
    if (!valid) throw new AuthError(401, "bad signature");

    const consumed = db.prepare("DELETE FROM auth_nonces WHERE nonce = ? AND expires_at > ?").run(parsed.nonce, t);
    if (consumed.changes !== 1) throw new AuthError(401, "nonce expired or already used");

    const address = getAddress(parsed.address);
    if (getUser(address)) {
      db.prepare("UPDATE users SET last_login_at = ? WHERE address = ?").run(t, address);
      return { status: "signedIn", token: openSession(address, t), user: getUser(address)! };
    }

    const signupToken = newToken();
    db.prepare("DELETE FROM pending_signups WHERE expires_at <= ? OR address = ?").run(t, address);
    db.prepare("INSERT INTO pending_signups (token_hash, address, expires_at) VALUES (?, ?, ?)").run(
      sha256(signupToken),
      address,
      t + SIGNUP_TTL_MS,
    );
    return { status: "needsSignup", signupToken, address };
  }

  function usernameStatus(username: string, exceptAddress?: string): { available: boolean; reason?: string } {
    const problem = usernameProblem(username);
    if (problem) return { available: false, reason: problem };
    const owner = db.prepare("SELECT address FROM users WHERE username = ?").get(username) as { address: string } | undefined;
    if (owner && owner.address !== exceptAddress) return { available: false, reason: "That name is taken." };
    return { available: true };
  }

  /** Creates the account for a wallet that proved ownership in signIn(), and opens a session. */
  function signUp(input: SignUpInput): { token: string; user: User } {
    const t = now();
    const problem = usernameProblem(input.username);
    if (problem) throw new AuthError(400, problem);
    if (!isAvatarId(input.avatar)) throw new AuthError(400, "pick one of the preset avatars");
    if (input.ageConfirmed !== true) throw new AuthError(400, "you must confirm you are 18 or older");
    if (input.termsAccepted !== true) throw new AuthError(400, "you must accept the terms");
    if (input.termsVersion !== TERMS_VERSION) throw new AuthError(409, "the terms changed, reload and review them");

    const pending = db
      .prepare("SELECT address FROM pending_signups WHERE token_hash = ? AND expires_at > ?")
      .get(sha256(input.signupToken), t) as { address: string } | undefined;
    if (!pending) throw new AuthError(401, "sign-up expired, sign in with your wallet again");
    if (getUser(pending.address)) throw new AuthError(409, "this wallet already has an account");

    try {
      db.prepare(
        `INSERT INTO users (address, username, avatar, age_confirmed_at, terms_version, terms_accepted_at, created_at, last_login_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(pending.address, input.username, input.avatar, t, TERMS_VERSION, t, t, t);
    } catch (e) {
      if (isUnique(e, "username")) throw new AuthError(409, "That name is taken.");
      throw e;
    }
    db.prepare("DELETE FROM pending_signups WHERE address = ?").run(pending.address);
    return { token: openSession(pending.address, t), user: getUser(pending.address)! };
  }

  function userForToken(token: string): User | null {
    const row = db
      .prepare(
        `SELECT u.* FROM sessions s JOIN users u ON u.address = s.address
         WHERE s.token_hash = ? AND s.expires_at > ?`,
      )
      .get(sha256(token), now()) as UserRow | undefined;
    return row ? toUser(row) : null;
  }

  function signOut(token: string) {
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha256(token));
  }

  function updateProfile(address: string, patch: { username?: string; avatar?: string }): User {
    if (patch.username !== undefined) {
      const s = usernameStatus(patch.username, address);
      if (!s.available) throw new AuthError(s.reason === "That name is taken." ? 409 : 400, s.reason!);
    }
    if (patch.avatar !== undefined && !isAvatarId(patch.avatar)) throw new AuthError(400, "pick one of the preset avatars");
    try {
      db.prepare("UPDATE users SET username = coalesce(?, username), avatar = coalesce(?, avatar) WHERE address = ?").run(
        patch.username ?? null,
        patch.avatar ?? null,
        getAddress(address),
      );
    } catch (e) {
      if (isUnique(e, "username")) throw new AuthError(409, "That name is taken.");
      throw e;
    }
    return getUser(address)!;
  }

  return { issueNonce, signIn, signUp, usernameStatus, userForToken, signOut, updateProfile, getUser, findUser };
}

export type Accounts = ReturnType<typeof createAccounts>;
