import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";

const contractsDir = resolve(import.meta.dirname, "..");
const sharedDir = resolve(contractsDir, "../packages/shared");

const { values: args } = parseArgs({
  options: {
    chain: { type: "string", default: "10143" },
    "broadcast-dir": { type: "string", default: join(contractsDir, "broadcast") },
    "dry-run": { type: "boolean", default: false },
  },
});

type Artifact = { abi: unknown[] };
type BroadcastTx = { hash: string; transactionType: string; contractName: string | null; contractAddress: string | null };
type Receipt = { transactionHash: string; blockNumber: string; status: string };
type Broadcast = { transactions: BroadcastTx[]; receipts: Receipt[] };

function write(path: string, content: string) {
  if (args["dry-run"]) {
    console.log(`dry run, would write ${path} (${content.length} bytes)`);
    if (content.length < 1000) console.log(content);
    return;
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  console.log(`wrote ${path}`);
}

const artifactPath = join(contractsDir, "out/FightClub.sol/FightClub.json");
if (!existsSync(artifactPath)) {
  console.error(`missing ${artifactPath}, run pnpm contracts:build first`);
  process.exit(1);
}
const { abi } = JSON.parse(readFileSync(artifactPath, "utf8")) as Artifact;
const abiSource = `export const fightClubAbi = ${JSON.stringify(abi, null, 2)} as const;\n`;
write(join(sharedDir, "src/abi/fightClub.ts"), abiSource);

const runPath = join(args["broadcast-dir"], "Deploy.s.sol", args.chain, "run-latest.json");
if (!existsSync(runPath)) {
  console.log(`no broadcast at ${runPath}, skipping deployments/${args.chain}.json`);
  process.exit(0);
}
const run = JSON.parse(readFileSync(runPath, "utf8")) as Broadcast;
const create = run.transactions.find((t) => t.transactionType === "CREATE" && t.contractName === "FightClub");
const receipt = run.receipts.find((r) => r.transactionHash === create?.hash);
if (!create?.contractAddress || !receipt) {
  console.error(`${runPath} has no confirmed FightClub CREATE`);
  process.exit(1);
}
if (receipt.status !== "0x1") {
  console.error(`FightClub deploy ${create.hash} reverted`);
  process.exit(1);
}
const deployment = {
  address: create.contractAddress,
  deployBlock: Number(BigInt(receipt.blockNumber)),
  txHash: create.hash,
};
write(join(sharedDir, `deployments/${args.chain}.json`), `${JSON.stringify(deployment, null, 2)}\n`);
