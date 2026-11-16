import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { runFighter as gatewayRunFighter, type RunFighterOptions, type RunResult } from "../llm/gateway.ts";
import { MODELS, type ModelEntry } from "../llm/models.ts";
import type { FightLimits } from "../fight/types.ts";
import { runFight } from "../fight/run.ts";

const OPENROUTER_SLUG = /^[\w.-]+\/[\w.:-]+$/;

/** Registry models that can run on OpenRouter, restricted to their OpenRouter routes. */
export const openRouterModels = (): ModelEntry[] =>
  MODELS.flatMap((m) => {
    const routes = m.routes.filter((r) => r.provider === "openrouter");
    return routes.length ? [{ ...m, routes: [routes[0]!, ...routes.slice(1)] }] : [];
  });

const vendorOf = (m: ModelEntry) => m.routes[0].model.split("/")[0]!;

/** A registry id, or any OpenRouter slug ("vendor/model") so paid models can be used with credit. */
export function resolveModel(id: string): ModelEntry | null {
  const known = openRouterModels().find((m) => m.id === id);
  if (known) return known;
  if (!OPENROUTER_SLUG.test(id)) return null;
  return {
    id,
    label: id.split("/")[1]!.replace(/:free$/, ""),
    maker: id.split("/")[0]!,
    weightClass: "middleweight",
    routes: [{ provider: "openrouter", model: id, reasoning: "off" }],
  };
}

const fightBody = z.object({
  prompt: z.string().trim().min(1).max(4000),
  category: z.string().trim().max(60).default("custom"),
  fighters: z
    .array(z.object({ name: z.string().trim().min(1).max(60), model: z.string().trim().min(1).max(120) }))
    .length(2),
});

const persona = (name: string) =>
  `You are ${name}, a robot fighter in an AI fight club. The crowd reads your answer blind next to a rival's and votes for the better one. Be specific, vivid and concrete. Plain text, no markdown headings.`;

export type FightMessage =
  | { type: "start"; fighters: { name: string; model: string; label: string }[]; limits: FightLimits }
  | { type: "event"; tMs: number; event: unknown }
  | { type: "text"; fighter: number; text: string }
  | { type: "done"; outcomes: { idx: number; status: string; output: string; pitch: string; reason?: string }[] }
  | { type: "error"; message: string };

export type FightConfig = {
  limits: FightLimits;
  /** model ids each corner starts with on the setup screen */
  defaults: [string, string];
  runFighter?: (opts: RunFighterOptions) => Promise<RunResult>;
};

export function fightRoutes(config: FightConfig) {
  const run = config.runFighter ?? gatewayRunFighter;
  const FIGHT_LIMITS = config.limits;
  for (const id of config.defaults) if (!resolveModel(id)) throw new Error(`FIGHT_DEFAULT_MODELS: unknown model ${id}`);

  return async (app: FastifyInstance) => {
    app.get("/api/fights/models", async () => ({
      models: openRouterModels().map((m) => ({ id: m.id, label: m.label, maker: m.maker, vendor: vendorOf(m), weightClass: m.weightClass })),
      defaults: config.defaults,
      limits: FIGHT_LIMITS,
    }));

    // streams NDJSON (one FightMessage per line) for the life of one fight; closing the request aborts the LLM calls
    app.post("/api/fights", async (req, reply) => {
      const parsed = fightBody.safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: "invalid request body" });
      const body = parsed.data;
      const entries = body.fighters.map((f) => resolveModel(f.model));
      if (entries.some((e) => e === null)) return reply.code(400).send({ error: "unknown model" });

      reply.hijack();
      const res = reply.raw;
      res.writeHead(200, {
        ...(reply.getHeaders() as Record<string, string>),
        "content-type": "application/x-ndjson; charset=utf-8",
        "cache-control": "no-cache",
        "x-accel-buffering": "no",
      });
      const send = (msg: FightMessage) => {
        if (!res.writableEnded) res.write(JSON.stringify(msg) + "\n");
      };

      const abort = new AbortController();
      res.on("close", () => abort.abort());
      const startedAt = Date.now();

      send({
        type: "start",
        fighters: body.fighters.map((f, i) => ({ name: f.name, model: entries[i]!.id, label: entries[i]!.label })),
        limits: FIGHT_LIMITS,
      });

      try {
        const outcomes = await runFight({
          roundId: 0,
          task: { prompt: body.prompt, category: body.category },
          fighters: body.fighters.map((f, idx) => ({ idx, name: f.name, persona: persona(f.name), memories: [], model: entries[idx]! })),
          limits: FIGHT_LIMITS,
          emit: (event) => send({ type: "event", tMs: Date.now() - startedAt, event }),
          runFighter: (opts) => {
            const fighter = entries.indexOf(opts.entry);
            return run({
              ...opts,
              signal: opts.signal ? AbortSignal.any([opts.signal, abort.signal]) : abort.signal,
              onDelta: (d) => {
                opts.onDelta?.(d);
                if (d.kind === "content") send({ type: "text", fighter, text: d.text });
              },
            });
          },
        });
        send({
          type: "done",
          outcomes: outcomes.map((o) => ({
            idx: o.idx,
            status: o.status,
            output: o.output,
            pitch: o.pitch,
            ...(o.status === "ko" ? { reason: o.reason } : {}),
          })),
        });
      } catch (err) {
        req.log.error(err);
        send({ type: "error", message: err instanceof Error ? err.message : "fight failed" });
      } finally {
        res.end();
      }
    });
  };
}
