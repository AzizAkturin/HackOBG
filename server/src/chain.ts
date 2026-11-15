import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { chain } from "@fightclub/shared";
import { env } from "./env.ts";

const transport = http(env.MONAD_RPC_HTTP);

export const publicClient = createPublicClient({ chain, transport });

export const operator = createWalletClient({
  chain,
  transport,
  account: privateKeyToAccount(env.OPERATOR_PK as `0x${string}`),
});

export const drip = createWalletClient({
  chain,
  transport,
  account: privateKeyToAccount(env.DRIP_PK as `0x${string}`),
});
