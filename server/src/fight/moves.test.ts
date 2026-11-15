import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { FightEvent } from "@wab/shared";
import { createMoveState, MOVE_THRESHOLDS, step, type MoveInput } from "./moves.ts";

function play(inputs: MoveInput[], budget = 1000) {
  let state = createMoveState({ fighter: 3, budget });
  const log: { tMs: number; event: FightEvent }[] = [];
  for (const input of inputs) {
    const next = step(state, input);
    state = next.state;
    for (const event of next.events) log.push({ tMs: input.tMs, event });
  }
  return log;
}

const content = (tMs: number, text: string): MoveInput => ({ type: "delta", kind: "content", text, tMs });
const reasoning = (tMs: number, text: string): MoveInput => ({ type: "delta", kind: "reasoning", text, tMs });
const tick = (tMs: number): MoveInput => ({ type: "tick", tMs });

const actions = (log: ReturnType<typeof play>) =>
  log.flatMap(({ tMs, event }) => (event.kind === "action" ? [{ tMs, move: event.move, intensity: event.intensity }] : []));

const steady = (from: number, to: number, size: number, every = 100) => {
  const out: MoveInput[] = [];
  for (let t = from; t <= to; t += every) out.push(content(t, "x".repeat(size)));
  return out;
};

describe("move deriver", () => {
  it("emits no actions for a steady stream", () => {
    assert.deepEqual(actions(play(steady(100, 4000, 10))), []);
  });

  it("jabs on a burst above the running average and combos when it is sustained", () => {
    const log = play([...steady(100, 2000, 10), ...steady(2100, 2600, 100)]);
    const got = actions(log);
    assert.deepEqual(
      got.map((a) => [a.tMs, a.move]),
      [
        [2100, "jab"],
        [2600, "combo"],
      ],
    );
    assert.ok(got.every((a) => a.intensity > 0 && a.intensity <= 1));
  });

  it("circles after a silent gap, once, then again only after the repeat interval", () => {
    const inputs = [...steady(100, 1000, 10)];
    for (let t = 1250; t <= 12000; t += 250) inputs.push(tick(t));
    const got = actions(play(inputs));
    assert.deepEqual(
      got.map((a) => [a.tMs, a.move]),
      [
        [3500, "circle"],
        [7500, "circle"],
        [11500, "circle"],
      ],
    );
  });

  it("treats reasoning as activity but still circles after a long stretch with no content", () => {
    const inputs: MoveInput[] = [];
    for (let t = 500; t <= 8000; t += 500) inputs.push(reasoning(t, "thinking "), tick(t));
    const got = actions(play(inputs));
    assert.deepEqual(got.map((a) => [a.tMs, a.move]), [[MOVE_THRESHOLDS.noContentGapMs, "circle"]]);
  });

  it("stops circling once content flows again and can circle in a later gap", () => {
    const inputs: MoveInput[] = [tick(3000), content(3100, "hello"), tick(5000), tick(5700), tick(5900), tick(6200)];
    const got = actions(play(inputs));
    assert.deepEqual(got.map((a) => [a.tMs, a.move]), [[3000, "circle"], [5700, "circle"]]);
  });

  it("combos with full intensity when a content line starts with PITCH:", () => {
    const got = actions(play([content(100, "Result body\n"), content(200, "PITCH: buy it")]));
    assert.deepEqual(got, [{ tMs: 200, move: "combo", intensity: 1 }]);
  });

  it("detects PITCH split across tokens, fires once per line, and ignores mid-line mentions", () => {
    const got = actions(
      play([content(100, "see PITCH: no\n"), content(200, "PIT"), content(300, "CH:"), content(400, " yes and more")]),
    );
    assert.deepEqual(got.map((a) => [a.tMs, a.move]), [[300, "combo"]]);
  });

  it("combos with lighter intensity on a markdown heading", () => {
    const got = actions(play([content(100, "intro\n## Plan\nbody")]));
    assert.equal(got.length, 1);
    assert.equal(got[0]?.move, "combo");
    assert.ok((got[0]?.intensity ?? 1) < 1);
  });

  it("staggers on retry", () => {
    assert.deepEqual(
      actions(play([{ type: "retry", tMs: 700 }])),
      [{ tMs: 700, move: "stagger", intensity: 1 }],
    );
  });

  it("taunts only for the first finisher", () => {
    assert.deepEqual(actions(play([{ type: "finished", tMs: 900, first: true }])).map((a) => a.move), ["taunt"]);
    assert.deepEqual(actions(play([{ type: "finished", tMs: 900, first: false }])), []);
  });

  it("tags every event with the fighter index", () => {
    const log = play([content(100, "PITCH: hi"), { type: "retry", tMs: 200 }, { type: "finished", tMs: 300, first: true }]);
    assert.ok(log.length > 0);
    for (const { event } of log) assert.equal("fighter" in event && event.fighter, 3);
  });
});

describe("progress and snippets", () => {
  const windowCount = (times: number[], t: number) => times.filter((x) => x >= t && x < t + 1000).length;

  it("throttles progress to at most 4 per second and reports tokens as chars/4", () => {
    const inputs: MoveInput[] = [];
    for (let t = 10; t <= 3000; t += 10) inputs.push(content(t, "abcd".repeat(2)));
    const log = play(inputs, 1000);
    const progress = log.flatMap(({ tMs, event }) => (event.kind === "progress" ? [{ tMs, ...event }] : []));
    const times = progress.map((p) => p.tMs);
    assert.ok(times.length >= 8);
    for (let t = 0; t <= 3000; t += 10) assert.ok(windowCount(times, t) <= 4, `window at ${t}`);
    const tokens = progress.map((p) => p.tokens);
    assert.deepEqual(tokens, [...tokens].sort((a, b) => a - b));
    assert.ok(progress.every((p) => p.budget === 1000));
    assert.equal(progress[0]?.tokens, 2);
    for (const p of progress) assert.equal(p.tokens, (8 * (p.tMs / 10)) / 4);
  });

  it("never reports more tokens than the budget", () => {
    const log = play([content(100, "x".repeat(2000)), tick(600)], 50);
    const tokens = log.flatMap(({ event }) => (event.kind === "progress" ? [event.tokens] : []));
    assert.deepEqual(tokens, [50]);
  });

  it("counts reasoning toward progress and flushes the trailing value on a tick", () => {
    const log = play([reasoning(100, "a".repeat(40)), reasoning(150, "a".repeat(40)), tick(400)]);
    const progress = log.flatMap(({ tMs, event }) => (event.kind === "progress" ? [{ tMs, tokens: event.tokens }] : []));
    assert.deepEqual(progress, [
      { tMs: 100, tokens: 10 },
      { tMs: 400, tokens: 20 },
    ]);
  });

  it("emits at most 1 snippet per second carrying the last 160 chars of content", () => {
    const inputs: MoveInput[] = [];
    let all = "";
    for (let t = 10; t <= 3000; t += 10) {
      const text = `${t},`;
      all += text;
      inputs.push(content(t, text));
    }
    inputs.push(tick(4000));
    const log = play(inputs);
    const snippets = log.flatMap(({ tMs, event }) => (event.kind === "snippet" ? [{ tMs, text: event.text }] : []));
    const times = snippets.map((s) => s.tMs);
    for (let t = 0; t <= 4000; t += 10) assert.ok(windowCount(times, t) <= 1, `window at ${t}`);
    assert.ok(snippets.length >= 3);
    assert.ok(snippets.every((s) => s.text.length <= 160));
    assert.equal(snippets.at(-1)?.text, all.slice(-160));
  });

  it("never puts the pitch section into a snippet", () => {
    const inputs = [content(100, "the result body\n"), content(200, "PITCH: secret sauce"), content(300, " more secret"), tick(2000)];
    const snippets = play(inputs).flatMap(({ event }) => (event.kind === "snippet" ? [event.text] : []));
    assert.ok(snippets.length >= 1);
    for (const text of snippets) assert.ok(!/secret|PITCH/.test(text), text);
  });
});
