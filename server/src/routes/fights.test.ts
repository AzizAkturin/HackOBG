import assert from "node:assert/strict";
import { test } from "node:test";
import Fastify from "fastify";
import type { RunFighterOptions, RunResult } from "../llm/gateway.ts";
import { fightRoutes, openRouterModels, resolveModel, type FightMessage } from "./fights.ts";

const fakeRun = async (opts: RunFighterOptions): Promise<RunResult> => {
  const content = `Answer from ${opts.entry.id}.\nPITCH: buy my answer`;
  opts.onDelta?.({ kind: "content", text: content });
  return { status: "finished", content, reasoningChars: 0, route: opts.entry.routes[0], attempts: 1, ms: 5 };
};

const app = async () => {
  const a = Fastify();
  await a.register(fightRoutes({ runFighter: fakeRun }));
  return a;
};

test("model list only offers OpenRouter routes", () => {
  const models = openRouterModels();
  assert.ok(models.length > 0);
  for (const m of models) assert.ok(m.routes.every((r) => r.provider === "openrouter"), m.id);
});

test("custom OpenRouter slugs resolve, junk does not", () => {
  assert.equal(resolveModel("anthropic/claude-sonnet-5.5")?.routes[0].model, "anthropic/claude-sonnet-5.5");
  assert.equal(resolveModel("not a model"), null);
  assert.equal(resolveModel("gemma-4-31b-it"), null);
});

test("a fight streams start, live text, events and both outcomes", async () => {
  const a = await app();
  const [m0, m1] = openRouterModels();
  const res = await a.inject({
    method: "POST",
    url: "/api/fights",
    payload: { prompt: "Pitch a startup", fighters: [{ name: "Red", model: m0!.id }, { name: "Blue", model: m1!.id }] },
  });
  assert.equal(res.statusCode, 200);
  const msgs = res.body.trim().split("\n").map((l) => JSON.parse(l) as FightMessage);
  assert.equal(msgs[0]!.type, "start");
  assert.ok(msgs.some((m) => m.type === "text" && m.fighter === 1 && m.text.includes(m1!.id)));
  assert.ok(msgs.some((m) => m.type === "event"));
  const done = msgs.at(-1)!;
  assert.equal(done.type, "done");
  if (done.type !== "done") return;
  assert.deepEqual(done.outcomes.map((o) => [o.idx, o.status, o.pitch]), [[0, "finished", "buy my answer"], [1, "finished", "buy my answer"]]);
});

test("bad bodies and unknown models are rejected before any call", async () => {
  const a = await app();
  const empty = await a.inject({ method: "POST", url: "/api/fights", payload: { prompt: "", fighters: [] } });
  assert.equal(empty.statusCode, 400);
  const bad = await a.inject({
    method: "POST",
    url: "/api/fights",
    payload: { prompt: "x", fighters: [{ name: "A", model: "nope" }, { name: "B", model: "nope" }] },
  });
  assert.equal(bad.statusCode, 400);
});
