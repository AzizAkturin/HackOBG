import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import Fastify from "fastify";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createSiweMessage } from "viem/siwe";
import { TERMS_VERSION } from "@wab/shared";
import { openDb } from "../db/index.ts";
import { authRoutes } from "../routes/auth.ts";
import { createAccounts, NONCE_TTL_MS, SIGNUP_TTL_MS } from "./accounts.ts";

const DOMAIN = "localhost:5173";
const CHAIN_ID = 10143;
const dir = mkdtempSync(join(tmpdir(), "auth-test-"));
after(() => rmSync(dir, { recursive: true, force: true }));

let n = 0;
async function setup() {
  let t = 1_800_000_000_000;
  const clock = { now: () => t, advance: (ms: number) => (t += ms) };
  const db = openDb(join(dir, `${++n}.sqlite`));
  const accounts = createAccounts(db, { domain: DOMAIN, chainId: CHAIN_ID, now: clock.now });
  const app = Fastify();
  await app.register(authRoutes(accounts).plugin);

  async function signed(pk = generatePrivateKey(), overrides: Partial<Parameters<typeof createSiweMessage>[0]> = {}) {
    const account = privateKeyToAccount(pk);
    const { nonce } = (await app.inject({ method: "GET", url: "/api/auth/nonce" })).json();
    const message = createSiweMessage({
      address: account.address,
      chainId: CHAIN_ID,
      domain: DOMAIN,
      nonce,
      uri: `http://${DOMAIN}`,
      version: "1",
      issuedAt: new Date(clock.now()),
      statement: "Sign in to WAB.",
      ...overrides,
    });
    return { account, message, signature: await account.signMessage({ message }) };
  }

  const verify = (message: string, signature: string) =>
    app.inject({ method: "POST", url: "/api/auth/verify", payload: { message, signature } });

  const profile = (over: Record<string, unknown> = {}) => ({
    username: "Iron_Mike",
    avatar: "ember",
    ageConfirmed: true,
    termsAccepted: true,
    termsVersion: TERMS_VERSION,
    ...over,
  });

  const signup = (signupToken: string, over: Record<string, unknown> = {}) =>
    app.inject({ method: "POST", url: "/api/auth/signup", payload: { signupToken, ...profile(over) } });

  /** Full new-user flow: sign, verify, sign up. Returns the session token. */
  async function register(username: string, pk = generatePrivateKey()) {
    const s = await signed(pk);
    const { signupToken } = (await verify(s.message, s.signature)).json();
    const r = await signup(signupToken, { username });
    assert.equal(r.statusCode, 201, r.body);
    return { token: r.json().token as string, address: s.account.address, pk };
  }

  return { app, clock, db, signed, verify, signup, register };
}

describe("sign-in", () => {
  it("does not create an account for a new wallet, it hands back a sign-up token", async () => {
    const { signed, verify, db } = await setup();
    const s = await signed();
    const r = await verify(s.message, s.signature);
    assert.equal(r.statusCode, 200);
    const body = r.json();
    assert.equal(body.status, "needsSignup");
    assert.equal(body.address, s.account.address);
    assert.ok(body.signupToken);
    assert.equal(body.token, undefined, "no session before sign-up");
    assert.equal((db.prepare("SELECT count(*) AS c FROM users").get() as { c: number }).c, 0);
  });

  it("signs an existing account straight in", async () => {
    const { signed, verify, register, clock } = await setup();
    const { pk, address } = await register("Iron_Mike");
    clock.advance(1000);
    const s = await signed(pk);
    const body = (await verify(s.message, s.signature)).json();
    assert.equal(body.status, "signedIn");
    assert.equal(body.user.address, address);
    assert.equal(body.user.username, "Iron_Mike");
    assert.ok(body.token);
  });

  it("rejects a signature from a different wallet than the message claims", async () => {
    const { signed, verify } = await setup();
    const { message } = await signed();
    const forged = await privateKeyToAccount(generatePrivateKey()).signMessage({ message });
    const r = await verify(message, forged);
    assert.equal(r.statusCode, 401);
    assert.equal(r.json().error, "bad signature");
  });

  it("rejects replayed and expired nonces", async () => {
    const { signed, verify, clock } = await setup();
    const a = await signed();
    assert.equal((await verify(a.message, a.signature)).statusCode, 200);
    assert.equal((await verify(a.message, a.signature)).statusCode, 401);

    const b = await signed();
    clock.advance(NONCE_TTL_MS + 1);
    assert.equal((await verify(b.message, b.signature)).statusCode, 401);
  });

  it("rejects a message signed for another site or another chain", async () => {
    const { signed, verify } = await setup();
    const phish = await signed(undefined, { domain: "evil.example" });
    assert.equal((await verify(phish.message, phish.signature)).statusCode, 401);
    const wrongChain = await signed(undefined, { chainId: 1 });
    assert.equal((await verify(wrongChain.message, wrongChain.signature)).statusCode, 400);
  });
});

describe("sign-up", () => {
  it("creates the account with username, avatar, 18+ and terms, then opens a session", async () => {
    const { app, signed, verify, signup, db } = await setup();
    const s = await signed();
    const { signupToken } = (await verify(s.message, s.signature)).json();
    const r = await signup(signupToken, { avatar: "volt" });
    assert.equal(r.statusCode, 201);
    const { token, user } = r.json();
    assert.deepEqual([user.address, user.username, user.avatar], [s.account.address, "Iron_Mike", "volt"]);

    const row = db.prepare("SELECT * FROM users").get() as Record<string, unknown>;
    assert.equal(row.terms_version, TERMS_VERSION);
    assert.ok(row.age_confirmed_at && row.terms_accepted_at);

    const me = await app.inject({ method: "GET", url: "/api/me", headers: { authorization: `Bearer ${token}` } });
    assert.equal(me.json().user.username, "Iron_Mike");
  });

  it("refuses without 18+ confirmation, terms, a valid avatar, or the current terms version", async () => {
    const { signed, verify, signup } = await setup();
    const s = await signed();
    const { signupToken } = (await verify(s.message, s.signature)).json();
    assert.equal((await signup(signupToken, { ageConfirmed: false })).statusCode, 400);
    assert.equal((await signup(signupToken, { termsAccepted: false })).statusCode, 400);
    assert.equal((await signup(signupToken, { avatar: "https://evil/x.png" })).statusCode, 400);
    assert.equal((await signup(signupToken, { termsVersion: "old" })).statusCode, 409);
    assert.equal((await signup(signupToken)).statusCode, 201, "the token survives rejected attempts");
  });

  it("validates usernames: format, reserved names, and case-insensitive uniqueness", async () => {
    const { app, signed, verify, signup, register } = await setup();
    await register("Iron_Mike");
    const s = await signed();
    const { signupToken } = (await verify(s.message, s.signature)).json();

    assert.equal((await signup(signupToken, { username: "no" })).statusCode, 400);
    assert.equal((await signup(signupToken, { username: "bad name!" })).statusCode, 400);
    assert.equal((await signup(signupToken, { username: "Admin" })).statusCode, 400);
    assert.equal((await signup(signupToken, { username: "iron_mike" })).statusCode, 409);

    const check = (name: string) => app.inject({ method: "GET", url: `/api/auth/username?name=${name}` }).then((r) => r.json());
    assert.deepEqual(await check("IRON_MIKE"), { available: false, reason: "That name is taken." });
    assert.equal((await check("x")).available, false);
    assert.deepEqual(await check("Rocky"), { available: true });
  });

  it("rejects an unknown, expired, or already-used sign-up token", async () => {
    const { signed, verify, signup, clock } = await setup();
    assert.equal((await signup("made-up")).statusCode, 401);

    const a = await signed();
    const ta = (await verify(a.message, a.signature)).json().signupToken;
    clock.advance(SIGNUP_TTL_MS + 1);
    assert.equal((await signup(ta)).statusCode, 401);

    const b = await signed();
    const tb = (await verify(b.message, b.signature)).json().signupToken;
    assert.equal((await signup(tb, { username: "First" })).statusCode, 201);
    assert.equal((await signup(tb, { username: "Second" })).statusCode, 401);
  });
});

describe("sessions and profile", () => {
  it("requires a valid session for /api/me and ends it on logout", async () => {
    const { app, register } = await setup();
    assert.equal((await app.inject({ method: "GET", url: "/api/me" })).statusCode, 401);
    const { token } = await register("Iron_Mike");
    const auth = { authorization: `Bearer ${token}` };
    assert.equal((await app.inject({ method: "POST", url: "/api/auth/logout", headers: auth })).statusCode, 204);
    assert.equal((await app.inject({ method: "GET", url: "/api/me", headers: auth })).statusCode, 401);
  });

  it("edits username and avatar, and shows them on the public profile", async () => {
    const { app, register } = await setup();
    const a = await register("Iron_Mike");
    const b = await register("Rocky");
    const patch = (token: string, payload: object) =>
      app.inject({ method: "PATCH", url: "/api/me", headers: { authorization: `Bearer ${token}` }, payload });

    assert.equal((await patch(a.token, { avatar: "frost" })).json().user.avatar, "frost");
    assert.equal((await patch(a.token, { username: "iron_mike" })).statusCode, 200, "re-casing your own name is fine");
    assert.equal((await patch(b.token, { username: "IRON_MIKE" })).statusCode, 409);
    assert.equal((await patch(a.token, { avatar: "nope" })).statusCode, 400);
    assert.equal((await patch(a.token, {})).statusCode, 400);

    const pub = (await app.inject({ method: "GET", url: `/api/users/${a.address.toLowerCase()}` })).json();
    assert.deepEqual([pub.user.username, pub.user.avatar], ["iron_mike", "frost"]);
    assert.equal(pub.user.lastLoginAt, undefined, "public profile hides login times");
    const byName = (await app.inject({ method: "GET", url: "/api/users/IRON_MIKE" })).json();
    assert.equal(byName.user.address, a.address, "profiles resolve by username, ignoring case");
    assert.equal((await app.inject({ method: "GET", url: "/api/users/0xnope" })).statusCode, 404);
    assert.equal((await app.inject({ method: "GET", url: "/api/users/nobody_here" })).statusCode, 404);
  });
});
