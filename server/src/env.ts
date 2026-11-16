import { z } from "zod";
import { privateKeyToAccount } from "viem/accounts";
import { PUBLIC_RPC_HTTP } from "@wab/shared";

const hex = (len: number) => z.string().regex(new RegExp(`^0x[0-9a-fA-F]{${len}}$`));
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === "" ? undefined : v), schema.optional());

const schema = z.object({
  PORT: z.coerce.number().int().default(8787),
  DB_PATH: z.string().default("./data/wab.sqlite"),
  WEB_ORIGIN: z.string().default("http://localhost:5173"),
  MONAD_RPC_HTTP: z.url().default(PUBLIC_RPC_HTTP),
  MONAD_RPC_WS: optional(z.url()),
  OPERATOR_PK: hex(64),
  OPERATOR_ADDRESS: hex(40),
  DRIP_PK: hex(64),
  DRIP_ADDRESS: hex(40),
  WAB_ADDRESS: optional(hex(40)),
  DEPLOY_BLOCK: optional(z.coerce.bigint()),
  NVIDIA_API_KEY: z.string().startsWith("nvapi-"),
  NVIDIA_BASE_URL: z.url().default("https://integrate.api.nvidia.com/v1"),
  OPENROUTER_API_KEY: z.string().startsWith("sk-or-"),
  OPENROUTER_BASE_URL: z.url().default("https://openrouter.ai/api/v1"),
  PRIVY_APP_ID: optional(z.string()),
  PRIVY_APP_SECRET: optional(z.string()),
});

function load() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`invalid server env: ${fields} (see server/.env.example)`);
  }
  const env = parsed.data;
  for (const role of ["OPERATOR", "DRIP"] as const) {
    const derived = privateKeyToAccount(env[`${role}_PK`] as `0x${string}`).address;
    if (derived.toLowerCase() !== env[`${role}_ADDRESS`].toLowerCase()) {
      throw new Error(`${role}_PK does not match ${role}_ADDRESS`);
    }
  }
  return env;
}

export const env = load();
