import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildMessages, splitPitch } from "./prompt.ts";
import type { FighterSpec } from "./types.ts";

const fighter = (over: Partial<FighterSpec> = {}): FighterSpec => ({
  idx: 0,
  name: "Vesper",
  persona: "You are a ruthless closer who loves numbers.",
  memories: [],
  model: { id: "m", label: "m", maker: "t", weightClass: "flyweight", routes: [{ provider: "nvidia", model: "x", reasoning: "off" }] },
  ...over,
});
const limits = { maxTokens: 1500, fightSeconds: 45 };
const task = { prompt: "Pitch a toaster for cats.", category: "pitch" };

describe("buildMessages", () => {
  it("puts the persona and the rules in the system message and the task in the user message", () => {
    const [system, user, ...rest] = buildMessages(fighter(), task, limits);
    assert.equal(rest.length, 0);
    assert.equal(system?.role, "system");
    assert.match(system?.content ?? "", /ruthless closer/);
    assert.match(system?.content ?? "", /PITCH:/);
    assert.match(system?.content ?? "", /120 words/);
    assert.match(system?.content ?? "", /1500 tokens/);
    assert.match(system?.content ?? "", /45 seconds/);
    assert.match(system?.content ?? "", /never name yourself or your model/i);
    assert.deepEqual(user, { role: "user", content: "Pitch a toaster for cats." });
  });

  it("includes only the last 5 memories, oldest first", () => {
    const memories = Array.from({ length: 8 }, (_, i) => `note-${i + 1}`);
    const system = buildMessages(fighter({ memories }), task, limits)[0]?.content ?? "";
    for (const gone of ["note-1", "note-2", "note-3"]) assert.ok(!system.includes(gone), gone);
    const positions = ["note-4", "note-5", "note-6", "note-7", "note-8"].map((n) => system.indexOf(n));
    assert.ok(positions.every((p) => p >= 0));
    assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  });

  it("includes the career summary when present and omits empty sections", () => {
    const withAll = buildMessages(fighter({ memories: ["lost to Vesper"], careerSummary: "Two wins, one loss." }), task, limits)[0]?.content;
    assert.match(withAll ?? "", /lost to Vesper/);
    assert.match(withAll ?? "", /Two wins, one loss\./);

    const bare = buildMessages(fighter({ memories: ["  ", ""], careerSummary: "  " }), task, limits)[0]?.content ?? "";
    assert.ok(!/recent fights/i.test(bare));
    assert.ok(!/career/i.test(bare));
  });

  it("does not leak the fighter name into the prompt", () => {
    const system = buildMessages(fighter(), task, limits)[0]?.content ?? "";
    assert.ok(!system.includes("Vesper"));
  });
});

describe("splitPitch", () => {
  it("splits on the last line-start PITCH marker", () => {
    const { result, pitch } = splitPitch("Draft.\nPITCH: first try\nMore work.\nPITCH: the real one\n");
    assert.equal(result, "Draft.\nPITCH: first try\nMore work.");
    assert.equal(pitch, "the real one");
  });

  it("is case insensitive and tolerates markdown decoration", () => {
    assert.equal(splitPitch("a\npitch: low").pitch, "low");
    assert.equal(splitPitch("a\n**PITCH:** bold").pitch, "bold");
    assert.equal(splitPitch("a\n## Pitch: head").pitch, "head");
  });

  it("ignores PITCH in the middle of a line", () => {
    assert.deepEqual(splitPitch("our PITCH: is great"), { result: "our PITCH: is great", pitch: null });
  });

  it("returns a null pitch when there is no section or it is empty", () => {
    assert.deepEqual(splitPitch("just a result\n"), { result: "just a result", pitch: null });
    assert.equal(splitPitch("result\nPITCH:   \n").pitch, null);
  });

  it("caps the pitch at 120 words", () => {
    const long = Array.from({ length: 200 }, (_, i) => `w${i}`).join(" ");
    const { pitch } = splitPitch(`done\nPITCH: ${long}`);
    const got = pitch?.split(" ") ?? [];
    assert.equal(got.length, 120);
    assert.equal(got[0], "w0");
    assert.equal(got[119], "w119");
  });
});
