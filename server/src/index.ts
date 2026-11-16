import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { formatEther } from "viem";
import { env } from "./env.ts";
import { openDb } from "./db/index.ts";
import { drip, operator, publicClient } from "./chain.ts";
import { createAccounts } from "./auth/accounts.ts";
import { authRoutes } from "./routes/auth.ts";

const db = openDb(env.DB_PATH);
const app = Fastify({ logger: true });

await app.register(cors, { origin: env.WEB_ORIGIN, methods: ["GET", "POST", "PATCH"] });
await app.register(websocket);

const accounts = createAccounts(db, { domain: new URL(env.WEB_ORIGIN).host, chainId: publicClient.chain.id });
await app.register(authRoutes(accounts).plugin);

app.get("/health", async () => {
  const [block, operatorBal, dripBal] = await Promise.all([
    publicClient.getBlockNumber(),
    publicClient.getBalance({ address: operator.account.address }),
    publicClient.getBalance({ address: drip.account.address }),
  ]);
  return {
    ok: true,
    chainId: publicClient.chain.id,
    block: block.toString(),
    operator: { address: operator.account.address, mon: formatEther(operatorBal) },
    drip: { address: drip.account.address, mon: formatEther(dripBal) },
    contract: env.WAB_ADDRESS ?? null,
    db: db.prepare("SELECT count(*) AS tables FROM sqlite_master WHERE type = 'table'").get(),
  };
});

app.get("/ws", { websocket: true }, (socket) => {
  socket.send(JSON.stringify({ type: "hello" }));
});

await app.listen({ port: env.PORT, host: "0.0.0.0" });
