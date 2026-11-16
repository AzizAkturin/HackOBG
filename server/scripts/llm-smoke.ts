import { runFighter } from "../src/llm/gateway.ts";
import { envProviders } from "../src/llm/env-providers.ts";
import { getModel, type ModelEntry } from "../src/llm/models.ts";

const allRoutes = process.argv.includes("--all-routes");
const messages = [
  { role: "user" as const, content: "Say hello in one short sentence, then end with a line starting with PITCH:" },
];

const entries: ModelEntry[] = allRoutes
  ? getModel("nemotron-3.5-lightning").routes.map((route) => ({
      ...getModel("nemotron-3.5-lightning"),
      routes: [route],
    }))
  : [getModel("nemotron-3.5-bolt-e4b")];

let failed = false;
for (const entry of entries) {
  const route = entry.routes[0];
  const result = await runFighter({
    entry,
    messages,
    maxTokens: 200,
    deadlineMs: 60_000,
    providers: envProviders,
  });
  const where = `${route.provider}:${route.model}`;
  if (result.status === "finished") {
    console.log(`${where} finished ms=${result.ms} contentChars=${result.content.length} reasoningChars=${result.reasoningChars} attempts=${result.attempts}`);
    console.log(result.content.slice(0, 200));
  } else {
    failed = true;
    console.log(`${where} ko reason=${result.reason} ms=${result.ms} attempts=${result.attempts} detail=${result.detail}`);
  }
}
process.exit(failed ? 1 : 0);
