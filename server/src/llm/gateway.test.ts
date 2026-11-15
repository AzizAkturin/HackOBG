import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { runFighter, type Delta, type RunFighterOptions, type RunResult } from "./gateway.ts";
import { MODELS, type ModelEntry } from "./models.ts";
import { buildProviders, type ProviderTable } from "./providers.ts";

type Seen = { path: string; body: any };
type Handler = (req: IncomingMessage, res: ServerResponse, seen: Seen) => void;

let server: Server;
let providers: ProviderTable;
let handler: Handler;
let seen: Seen[] = [];

before(async () => {
  server = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const entry = { path: req.url ?? "", body: JSON.parse(raw) };
      seen.push(entry);
      handler(req, res, entry);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  providers = buildProviders({
    nvidia: { baseUrl: `${base}/nvidia/v1`, apiKey: "nvapi-test" },
    openrouter: { baseUrl: `${base}/openrouter/v1`, apiKey: "sk-or-test" },
  });
});

after(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

const sse = (res: ServerResponse) => res.writeHead(200, { "Content-Type": "text/event-stream" });
const send = (res: ServerResponse, obj: unknown) => res.write(`data: ${JSON.stringify(obj)}\n\n`);
const delta = (d: Record<string, string>, finish: string | null = null) => ({
  choices: [{ index: 0, delta: d, finish_reason: finish }],
});
const usage = (completion: number) => ({
  choices: [],
  usage: { prompt_tokens: 10, completion_tokens: completion, total_tokens: 10 + completion },
});

const single: ModelEntry = {
  id: "t-single",
  label: "single",
  maker: "test",
  weightClass: "flyweight",
  routes: [{ provider: "nvidia", model: "test/single", reasoning: "off" }],
};
const dual: ModelEntry = {
  id: "t-dual",
  label: "dual",
  maker: "test",
  weightClass: "flyweight",
  routes: [
    { provider: "nvidia", model: "test/dual", reasoning: "off" },
    { provider: "openrouter", model: "test/dual:free", reasoning: "low" },
  ],
};

async function run(entry: ModelEntry, handle: Handler, extra: { deadlineMs?: number; signal?: AbortSignal; onRetry?: RunFighterOptions["onRetry"] } = {}) {
  seen = [];
  handler = handle;
  const deltas: Delta[] = [];
  const result = await runFighter({
    entry,
    messages: [{ role: "user", content: "fight" }],
    maxTokens: 100,
    deadlineMs: extra.deadlineMs ?? 5000,
    signal: extra.signal,
    onDelta: (d) => deltas.push(d),
    onRetry: extra.onRetry,
    providers,
  });
  return { result, deltas };
}

function ko(result: RunResult) {
  assert.equal(result.status, "ko");
  return result as Extract<RunResult, { status: "ko" }>;
}

const goodStream: Handler = (_req, res) => {
  sse(res);
  send(res, delta({ content: "Hel" }));
  send(res, delta({ content: "lo" }));
  send(res, delta({}, "stop"));
  send(res, usage(2));
  res.end("data: [DONE]\n\n");
};

describe("runFighter", () => {
  it("rethrows an onDelta error without spending a retry", async () => {
    seen = [];
    handler = (_req, res) => {
      sse(res);
      send(res, delta({ reasoning_content: "thinking" }));
      send(res, delta({}, "stop"));
      res.end("data: [DONE]\n\n");
    };
    const boom = new Error("recorder failed");
    await assert.rejects(
      runFighter({
        entry: dual,
        messages: [{ role: "user", content: "fight" }],
        maxTokens: 100,
        deadlineMs: 5000,
        onDelta: () => {
          throw boom;
        },
        providers,
      }),
      (e) => e === boom,
    );
    assert.equal(seen.length, 1);
  });

  it("streams content to onDelta in order and finishes", async () => {
    const { result, deltas } = await run(single, goodStream);
    assert.equal(result.status, "finished");
    assert.equal((result as any).content, "Hello");
    assert.deepEqual(deltas, [
      { kind: "content", text: "Hel" },
      { kind: "content", text: "lo" },
    ]);
    assert.equal(result.attempts, 1);
    assert.deepEqual((result as any).usage, { promptTokens: 10, completionTokens: 2, totalTokens: 12 });
    assert.equal(seen.length, 1);
    assert.equal(seen[0]?.body.stream, true);
    assert.deepEqual(seen[0]?.body.stream_options, { include_usage: true });
    assert.equal(seen[0]?.body.max_tokens, 100);
  });

  it("separates reasoning from content for both field names", async () => {
    const { result, deltas } = await run(single, (_req, res) => {
      sse(res);
      send(res, delta({ reasoning_content: "think " }));
      send(res, delta({ reasoning: "more" }));
      send(res, delta({ content: "answer" }));
      send(res, delta({}, "stop"));
      res.end("data: [DONE]\n\n");
    });
    assert.equal(result.status, "finished");
    assert.equal((result as any).content, "answer");
    assert.equal((result as any).reasoningChars, 10);
    assert.deepEqual(deltas, [
      { kind: "reasoning", text: "think " },
      { kind: "reasoning", text: "more" },
      { kind: "content", text: "answer" },
    ]);
  });

  it("ko budget_exhausted without a retry when reasoning eats the budget", async () => {
    const { result } = await run(dual, (_req, res) => {
      sse(res);
      send(res, delta({ reasoning_content: "hmm" }));
      send(res, delta({}, "length"));
      res.end("data: [DONE]\n\n");
    });
    const r = ko(result);
    assert.equal(r.reason, "budget_exhausted");
    assert.equal(r.attempts, 1);
    assert.equal(seen.length, 1);
  });

  it("ko empty after retrying on a clean stream with no content", async () => {
    const { result } = await run(single, (_req, res) => {
      sse(res);
      send(res, delta({}, "stop"));
      res.end("data: [DONE]\n\n");
    });
    const r = ko(result);
    assert.equal(r.reason, "empty");
    assert.equal(r.attempts, 2);
  });

  it("falls back to the next route on 503 and sends each provider's reasoning fields", async () => {
    const { result } = await run(dual, (req, res) => {
      if (req.url?.startsWith("/nvidia")) {
        res.writeHead(503).end("unavailable");
        return;
      }
      goodStream(req, res, undefined as never);
    });
    assert.equal(result.status, "finished");
    assert.equal(result.attempts, 2);
    assert.equal(result.route.provider, "openrouter");
    assert.equal(seen.length, 2);
    assert.equal(seen[0]?.path, "/nvidia/v1/chat/completions");
    assert.equal(seen[0]?.body.model, "test/dual");
    assert.deepEqual(seen[0]?.body.chat_template_kwargs, { enable_thinking: false });
    assert.equal(seen[0]?.body.reasoning, undefined);
    assert.equal(seen[1]?.path, "/openrouter/v1/chat/completions");
    assert.equal(seen[1]?.body.model, "test/dual:free");
    assert.deepEqual(seen[1]?.body.reasoning, { effort: "low" });
    assert.equal(seen[1]?.body.chat_template_kwargs, undefined);
  });

  it("retries the same route when the entry has only one", async () => {
    let calls = 0;
    const { result } = await run(single, (req, res) => {
      if (++calls === 1) {
        res.writeHead(429).end("slow down");
        return;
      }
      goodStream(req, res, undefined as never);
    });
    assert.equal(result.status, "finished");
    assert.equal(result.attempts, 2);
    assert.equal(seen[1]?.path, "/nvidia/v1/chat/completions");
  });

  it("calls onRetry before the second attempt with the route it will use, and not on a first-try success", async () => {
    const retries: { attempt: number; model: string; requestsSoFar: number }[] = [];
    const onRetry: RunFighterOptions["onRetry"] = (attempt, route) =>
      retries.push({ attempt, model: route.model, requestsSoFar: seen.length });
    const { result } = await run(
      dual,
      (req, res) => {
        if (req.url?.startsWith("/nvidia")) {
          res.writeHead(503).end("unavailable");
          return;
        }
        goodStream(req, res, undefined as never);
      },
      { onRetry },
    );
    assert.equal(result.status, "finished");
    assert.deepEqual(retries, [{ attempt: 2, model: "test/dual:free", requestsSoFar: 1 }]);

    retries.length = 0;
    await run(single, goodStream, { onRetry });
    assert.deepEqual(retries, []);
  });

  it("does not retry a non-retryable 4xx", async () => {
    const { result } = await run(dual, (_req, res) => {
      res.writeHead(401).end("bad key");
    });
    const r = ko(result);
    assert.equal(r.reason, "http_error");
    assert.equal(r.attempts, 1);
    assert.match(r.detail, /401/);
  });

  it("ko without retry when the connection drops after content streamed", async () => {
    const { result, deltas } = await run(dual, (_req, res) => {
      sse(res);
      send(res, delta({ content: "partial" }));
      setTimeout(() => res.socket?.destroy(), 20);
    });
    const r = ko(result);
    assert.equal(r.reason, "http_error");
    assert.equal(r.attempts, 1);
    assert.equal(r.partialContent, "partial");
    assert.equal(seen.length, 1);
    assert.deepEqual(deltas, [{ kind: "content", text: "partial" }]);
  });

  it("ko timeout at the deadline and keeps partial content", async () => {
    const started = Date.now();
    const { result } = await run(
      single,
      (_req, res) => {
        sse(res);
        send(res, delta({ content: "slow" }));
      },
      { deadlineMs: 200 },
    );
    const r = ko(result);
    assert.equal(r.reason, "timeout");
    assert.equal(r.attempts, 1);
    assert.equal(r.partialContent, "slow");
    assert.ok(Date.now() - started < 2000);
  });

  it("one deadline spans all attempts", async () => {
    const started = Date.now();
    const { result } = await run(
      dual,
      (req, res) => {
        if (req.url?.startsWith("/nvidia")) res.writeHead(503).end("down");
      },
      { deadlineMs: 300 },
    );
    const r = ko(result);
    assert.equal(r.reason, "timeout");
    assert.equal(r.attempts, 2);
    assert.ok(Date.now() - started < 2000);
  });

  it("ko aborted when the caller signal fires", async () => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 100);
    const { result } = await run(dual, () => {}, { signal: controller.signal });
    const r = ko(result);
    assert.equal(r.reason, "aborted");
    assert.equal(r.attempts, 1);
  });

  it("treats a mid-stream error line as http_error and retries when no content yet", async () => {
    let calls = 0;
    const { result } = await run(dual, (req, res) => {
      if (++calls === 1) {
        sse(res);
        send(res, { error: { message: "upstream blew up", code: 500 } });
        res.end();
        return;
      }
      goodStream(req, res, undefined as never);
    });
    assert.equal(result.status, "finished");
    assert.equal(result.attempts, 2);
    assert.equal(result.route.provider, "openrouter");
  });

  it("ko without retry when a mid-stream error follows streamed content", async () => {
    const { result } = await run(dual, (_req, res) => {
      sse(res);
      send(res, delta({ content: "half" }));
      send(res, { error: { message: "boom" } });
      res.end();
    });
    const r = ko(result);
    assert.equal(r.reason, "http_error");
    assert.equal(r.attempts, 1);
    assert.equal(r.partialContent, "half");
    assert.match(r.detail, /boom/);
  });

  it("throws on config errors instead of returning a ko", async () => {
    const bad = { ...single, routes: [{ provider: "nope", model: "x", reasoning: "default" }] } as unknown as ModelEntry;
    await assert.rejects(run(bad, goodStream), /unknown provider/);
  });
});

describe("registry", () => {
  it("has unique ids and non-empty routes on known providers", () => {
    const ids = new Set(MODELS.map((m) => m.id));
    assert.equal(ids.size, MODELS.length);
    for (const entry of MODELS) {
      assert.ok(entry.routes.length >= 1, `${entry.id} has no routes`);
      for (const route of entry.routes) {
        assert.ok(route.provider in providers, `${entry.id} uses unknown provider ${route.provider}`);
      }
    }
  });

  it("puts NVIDIA first on dual-route entries", () => {
    for (const entry of MODELS.filter((m) => m.routes.length > 1)) {
      assert.equal(entry.routes[0].provider, "nvidia", entry.id);
    }
  });
});
