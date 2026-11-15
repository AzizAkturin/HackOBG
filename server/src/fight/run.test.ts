import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import type { FightEvent } from "@fightclub/shared";
import type { Delta, RunFighterOptions, RunResult } from "../llm/gateway.ts";
import type { ModelEntry, ModelRoute } from "../llm/models.ts";
import { KO_PITCH, runFight } from "./run.ts";
import type { FighterSpec } from "./types.ts";

const route: ModelRoute = { provider: "nvidia", model: "x", reasoning: "off" };
const entry = (id: string): ModelEntry => ({ id, label: id, maker: "t", weightClass: "flyweight", routes: [route] });
const spec = (idx: number): FighterSpec => ({
  idx,
  name: `F${idx}`,
  persona: `persona-${idx}`,
  memories: [],
  model: entry(`m${idx}`),
});
const limits = { maxTokens: 1000, fightSeconds: 60 };
const task = { prompt: "do it", category: "pitch" };

type Step = { at: number; delta?: Delta; retry?: true };
type Script = { steps: Step[]; endAt: number; result: RunResult };

const finished = (content: string, completionTokens?: number): RunResult => ({
  status: "finished",
  content,
  reasoningChars: 0,
  usage: completionTokens === undefined ? undefined : { completionTokens },
  route,
  attempts: 1,
  ms: 0,
});
const ko = (reason: Extract<RunResult, { status: "ko" }>["reason"], partialContent = ""): RunResult => ({
  status: "ko",
  reason,
  detail: reason,
  route,
  attempts: 1,
  ms: 0,
  partialContent,
});
const text = (at: number, t: string): Step => ({ at, delta: { kind: "content", text: t } });

function harness(scripts: Record<string, Script>) {
  const clock = { t: 10_000 };
  const pending = new Map<string, { opts: RunFighterOptions; resolve: (r: RunResult) => void }>();
  const calls: RunFighterOptions[] = [];
  const runFighter = (opts: RunFighterOptions) => {
    calls.push(opts);
    return new Promise<RunResult>((resolve) => pending.set(opts.entry.id, { opts, resolve }));
  };
  const flush = () => new Promise((r) => setImmediate(r));
  const play = async () => {
    const timeline: { at: number; order: number; run: () => void }[] = [];
    let order = 0;
    for (const [id, script] of Object.entries(scripts)) {
      const p = pending.get(id);
      assert.ok(p, `fighter ${id} was not started`);
      for (const s of script.steps) {
        timeline.push({
          at: s.at,
          order: order++,
          run: () => (s.retry ? p.opts.onRetry?.(2, route) : p.opts.onDelta?.(s.delta!)),
        });
      }
      timeline.push({ at: script.endAt, order: order++, run: () => p.resolve(script.result) });
    }
    timeline.sort((a, b) => a.at - b.at || a.order - b.order);
    for (const item of timeline) {
      clock.t = 10_000 + item.at;
      item.run();
      await flush();
    }
  };
  return { now: () => clock.t, setNow: (at: number) => (clock.t = 10_000 + at), runFighter, play, calls };
}

const kinds = (events: FightEvent[], kind: FightEvent["kind"]) => events.filter((e) => e.kind === kind);
const moves = (events: FightEvent[], fighter: number) =>
  events.flatMap((e) => (e.kind === "action" && e.fighter === fighter ? [e.move] : []));

afterEach(() => mock.timers.reset());

describe("runFight", () => {
  it("runs fighters concurrently, emits phase and finished, splits pitches and orders outcomes by idx", async () => {
    const h = harness({
      m0: { steps: [text(100, "alpha result\n"), text(200, "PITCH: alpha pitch")], endAt: 3000, result: finished("alpha result\nPITCH: alpha pitch", 40) },
      m1: { steps: [text(100, "beta")], endAt: 2000, result: finished("beta result\nPITCH: beta pitch") },
      m2: { steps: [text(100, "gamma")], endAt: 4000, result: finished("gamma only, no pitch section here") },
    });
    const events: FightEvent[] = [];
    const outcomesP = runFight({
      roundId: 1,
      task,
      fighters: [spec(2), spec(0), spec(1)],
      limits,
      emit: (e) => events.push(e),
      runFighter: h.runFighter,
      now: h.now,
    });
    assert.equal(h.calls.length, 3);
    for (const call of h.calls) {
      assert.equal(call.deadlineMs, 60_000);
      assert.equal(call.maxTokens, 1000);
      assert.equal(call.messages[1]?.content, "do it");
    }
    assert.match(h.calls.find((c) => c.entry.id === "m1")?.messages[0]?.content ?? "", /persona-1/);

    await h.play();
    const outcomes = await outcomesP;

    assert.deepEqual(events[0], { kind: "phase", phase: "fighting", endsAt: 10_000 + 60_000 });
    assert.deepEqual(
      kinds(events, "finished").map((e) => e.kind === "finished" && [e.fighter, e.atMs]),
      [[1, 2000], [0, 3000], [2, 4000]],
    );
    assert.deepEqual(moves(events, 1), ["taunt"]);
    assert.deepEqual(moves(events, 0), ["combo"]);
    assert.deepEqual(moves(events, 2), []);
    assert.equal(kinds(events, "ko").length, 0);
    assert.equal(kinds(events, "pitches").length, 0);

    assert.deepEqual(outcomes.map((o) => o.idx), [0, 1, 2]);
    assert.deepEqual(outcomes[0], { status: "finished", idx: 0, output: "alpha result", pitch: "alpha pitch", tokensUsed: 40, finishedAtMs: 3000 });
    assert.equal(outcomes[1]?.output, "beta result");
    assert.equal(outcomes[1]?.pitch, "beta pitch");
    assert.equal(outcomes[1]?.tokensUsed, Math.ceil(("beta result\nPITCH: beta pitch").length / 4));
    assert.equal(outcomes[2]?.status, "finished");
    assert.equal(outcomes[2]?.output, "gamma only, no pitch section here");
    assert.equal(outcomes[2]?.pitch, "gamma only, no pitch section here");
  });

  it("uses the last 120 words of the output as the pitch when a finisher wrote none", async () => {
    const long = Array.from({ length: 300 }, (_, i) => `w${i}`).join(" ");
    const h = harness({ m0: { steps: [], endAt: 500, result: finished(long) }, m1: { steps: [], endAt: 600, result: finished("x\nPITCH: y") } });
    const p = runFight({ roundId: 1, task, fighters: [spec(0), spec(1)], limits, emit: () => {}, runFighter: h.runFighter, now: h.now });
    await h.play();
    const [a] = await p;
    const pitchWords = a?.pitch.split(" ") ?? [];
    assert.equal(pitchWords.length, 120);
    assert.equal(pitchWords[0], "w180");
    assert.equal(pitchWords[119], "w299");
  });

  it("knocks out a failed fighter with a fixed pitch, keeps the round going, and never leaks pitch text", async () => {
    const h = harness({
      m0: { steps: [text(100, "partial work")], endAt: 1500, result: ko("http_error", "partial work") },
      m1: { steps: [text(100, "ok\n"), text(300, "PITCH: SECRETPITCH")], endAt: 2500, result: finished("ok\nPITCH: SECRETPITCH") },
    });
    const events: FightEvent[] = [];
    const p = runFight({ roundId: 1, task, fighters: [spec(0), spec(1)], limits, emit: (e) => events.push(e), runFighter: h.runFighter, now: h.now });
    await h.play();
    const [a, b] = await p;

    assert.deepEqual(a, { status: "ko", idx: 0, reason: "http_error", output: "partial work", pitch: KO_PITCH, tokensUsed: 3, finishedAtMs: 1500 });
    assert.equal(b?.status, "finished");
    assert.deepEqual(kinds(events, "ko"), [{ kind: "ko", fighter: 0, reason: "http_error" }]);
    assert.deepEqual(moves(events, 1), ["combo", "taunt"]);
    assert.ok(!JSON.stringify(events).includes("SECRETPITCH"));
  });

  it("counts a timeout whose partial content has a PITCH section as finished, otherwise as a KO", async () => {
    const h = harness({
      m0: { steps: [], endAt: 60_000, result: ko("timeout", "work done\nPITCH: made it just in time") },
      m1: { steps: [], endAt: 60_000, result: ko("timeout", "still thinking, no pitch yet") },
      m2: { steps: [], endAt: 60_000, result: ko("timeout", "x\nPITCH:  ") },
    });
    const events: FightEvent[] = [];
    const p = runFight({ roundId: 1, task, fighters: [spec(0), spec(1), spec(2)], limits, emit: (e) => events.push(e), runFighter: h.runFighter, now: h.now });
    await h.play();
    const [a, b, c] = await p;

    assert.equal(a?.status, "finished");
    assert.equal(a?.output, "work done");
    assert.equal(a?.pitch, "made it just in time");
    assert.equal(a?.finishedAtMs, 60_000);
    assert.equal(b?.status, "ko");
    assert.equal(b?.status === "ko" && b.reason, "timeout");
    assert.equal(b?.pitch, KO_PITCH);
    assert.equal(c?.status, "ko");
    assert.deepEqual(kinds(events, "finished").map((e) => e.kind === "finished" && e.fighter), [0]);
    assert.deepEqual(kinds(events, "ko").map((e) => e.kind === "ko" && e.fighter), [1, 2]);
  });

  it("staggers a fighter when the gateway retries", async () => {
    const h = harness({
      m0: { steps: [{ at: 800, retry: true }, text(900, "back\nPITCH: p")], endAt: 1000, result: finished("back\nPITCH: p") },
      m1: { steps: [], endAt: 5000, result: finished("z\nPITCH: q") },
    });
    const events: FightEvent[] = [];
    const p = runFight({ roundId: 1, task, fighters: [spec(0), spec(1)], limits, emit: (e) => events.push(e), runFighter: h.runFighter, now: h.now });
    await h.play();
    await p;
    assert.deepEqual(moves(events, 0).slice(0, 1), ["stagger"]);
  });

  it("drives ticks on an interval and stops them when the fight ends", async () => {
    mock.timers.enable({ apis: ["setInterval"] });
    const h = harness({ m0: { steps: [], endAt: 9000, result: finished("a\nPITCH: b") }, m1: { steps: [], endAt: 9000, result: finished("a\nPITCH: b") } });
    const events: FightEvent[] = [];
    const p = runFight({ roundId: 1, task, fighters: [spec(0), spec(1)], limits, emit: (e) => events.push(e), runFighter: h.runFighter, now: h.now });

    h.setNow(3500);
    mock.timers.tick(250);
    assert.deepEqual(moves(events, 0), ["circle"]);
    assert.deepEqual(moves(events, 1), ["circle"]);

    await h.play();
    await p;
    const before = events.length;
    h.setNow(60_000);
    mock.timers.tick(5000);
    assert.equal(events.length, before);
  });

  it("rejects and aborts the other fighters when a fighter call throws", async () => {
    mock.timers.enable({ apis: ["setInterval"] });
    let abortSignal: AbortSignal | undefined;
    const events: FightEvent[] = [];
    const runFighter = (opts: RunFighterOptions): Promise<RunResult> => {
      if (opts.entry.id === "m0") return Promise.reject(new Error("unknown provider: nope"));
      abortSignal = opts.signal;
      return new Promise(() => {});
    };
    await assert.rejects(
      runFight({ roundId: 1, task, fighters: [spec(0), spec(1)], limits, emit: (e) => events.push(e), runFighter }),
      /unknown provider/,
    );
    assert.equal(abortSignal?.aborted, true);
    const before = events.length;
    mock.timers.tick(10_000);
    assert.equal(events.length, before);
  });
});
