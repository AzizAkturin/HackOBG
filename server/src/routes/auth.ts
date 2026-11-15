import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { AuthError, toPublic, type Accounts, type User } from "../auth/accounts.ts";

declare module "fastify" {
  interface FastifyRequest {
    user?: User;
  }
}

const bearer = (req: FastifyRequest) => {
  const h = req.headers.authorization;
  return h?.startsWith("Bearer ") ? h.slice(7).trim() : null;
};

const verifyBody = z.object({
  message: z.string().min(1).max(4000),
  signature: z.string().regex(/^0x[0-9a-fA-F]+$/),
});

const signupBody = z.object({
  signupToken: z.string().min(1).max(200),
  username: z.string().trim(),
  avatar: z.string(),
  ageConfirmed: z.boolean(),
  termsAccepted: z.boolean(),
  termsVersion: z.string(),
});

const profileBody = z
  .object({ username: z.string().trim().optional(), avatar: z.string().optional() })
  .refine((b) => b.username !== undefined || b.avatar !== undefined, "nothing to update");

export function authRoutes(accounts: Accounts) {
  /** preHandler for routes that need a signed-in user. */
  const requireUser = async (req: FastifyRequest, reply: FastifyReply) => {
    const token = bearer(req);
    const user = token ? accounts.userForToken(token) : null;
    if (!user) return reply.code(401).send({ error: "sign in required" });
    req.user = user;
  };

  const plugin = async (app: FastifyInstance) => {
    app.setErrorHandler((err, _req, reply) => {
      if (err instanceof AuthError) return reply.code(err.status).send({ error: err.message });
      if (err instanceof z.ZodError) return reply.code(400).send({ error: "invalid request body" });
      app.log.error(err);
      return reply.code(500).send({ error: "internal error" });
    });

    app.get("/api/auth/nonce", async () => ({ nonce: accounts.issueNonce() }));

    // Existing account -> { status: "signedIn", token, user }. New wallet -> { status: "needsSignup", signupToken, address }.
    app.post("/api/auth/verify", async (req) => {
      const { message, signature } = verifyBody.parse(req.body);
      return accounts.signIn(message, signature as `0x${string}`);
    });

    app.post("/api/auth/signup", async (req, reply) => {
      const result = accounts.signUp(signupBody.parse(req.body));
      return reply.code(201).send(result);
    });

    app.get<{ Querystring: { name?: string } }>("/api/auth/username", async (req) =>
      accounts.usernameStatus((req.query.name ?? "").trim()),
    );

    app.post("/api/auth/logout", async (req, reply) => {
      const token = bearer(req);
      if (token) accounts.signOut(token);
      return reply.code(204).send();
    });

    app.get("/api/me", { preHandler: requireUser }, async (req) => ({ user: req.user }));

    app.patch("/api/me", { preHandler: requireUser }, async (req) => ({
      user: accounts.updateProfile(req.user!.address, profileBody.parse(req.body)),
    }));

    // :id is a wallet address or a username (case-insensitive).
    app.get<{ Params: { id: string } }>("/api/users/:id", async (req, reply) => {
      const user = accounts.findUser(req.params.id);
      if (!user) return reply.code(404).send({ error: "no account found" });
      return { user: toPublic(user) };
    });
  };

  return { plugin, requireUser };
}
