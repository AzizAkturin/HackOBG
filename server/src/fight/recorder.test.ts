import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import type { EventEnvelope, FightEvent } from "@fightclub/shared";
import { openDb } from "../db/index.ts";
import { createRecorder, loadEvents } from "./recorder.ts";

const dir = mkdtempSync(join(tmpdir(), "recorder-test-"));
after(() => rmSync(dir, { recursive: true, force: true }));

const clock = (start = 1_000_000) => {
  let t = start;
  return { now: () => t, set: (v: number) => (t = v) };
};

describe("recorder", () => {
  it("writes increasing seq rows with relative tMs and the fighter index, and notifies the listener", () => {
    const db = openDb(join(dir, "a.sqlite"));
    const c = clock();
    const heard: EventEnvelope[] = [];
    const emit = createRecorder(db, 7, (e) => heard.push(e), c.now);

    const events: FightEvent[] = [
      { kind: "phase", phase: "fighting", endsAt: 99 },
      { kind: "action", fighter: 2, move: "jab", intensity: 0.5 },
      { kind: "finished", fighter: 1, atMs: 1200 },
    ];
    emit(events[0]!);
    c.set(1_000_250);
    emit(events[1]!);
    c.set(1_001_000);
    emit(events[2]!);

    assert.deepEqual(
      heard.map((e) => [e.roundId, e.seq, e.tMs]),
      [[7, 1, 0], [7, 2, 250], [7, 3, 1000]],
    );
    const rows = db
      .prepare("SELECT seq, t_ms, fighter_idx, kind FROM round_events WHERE round_id = 7 ORDER BY seq")
      .all();
    assert.deepEqual(
      rows.map((r) => ({ ...r })),
      [
        { seq: 1, t_ms: 0, fighter_idx: null, kind: "phase" },
        { seq: 2, t_ms: 250, fighter_idx: 2, kind: "action" },
        { seq: 3, t_ms: 1000, fighter_idx: 1, kind: "finished" },
      ],
    );
    assert.deepEqual(loadEvents(db, 7).map((e) => e.event), events);
    assert.deepEqual(loadEvents(db, 7, 2).map((e) => e.seq), [3]);
    db.close();
  });

  it("continues seq and tMs from what is stored when reopened, per round", () => {
    const path = join(dir, "b.sqlite");
    const first = openDb(path);
    const c1 = clock(5000);
    const emit1 = createRecorder(first, 1, undefined, c1.now);
    emit1({ kind: "phase", phase: "fighting" });
    c1.set(5800);
    emit1({ kind: "ko", fighter: 0, reason: "timeout" });
    createRecorder(first, 2, undefined, c1.now)({ kind: "phase", phase: "open" });
    first.close();

    const reopened = openDb(path);
    const c2 = clock(90_000);
    const emit2 = createRecorder(reopened, 1, undefined, c2.now);
    c2.set(90_100);
    const env = emit2({ kind: "phase", phase: "pitching" });
    assert.equal(env.seq, 3);
    assert.equal(env.tMs, 900);

    const other = createRecorder(reopened, 3, undefined, c2.now)({ kind: "phase", phase: "open" });
    assert.equal(other.seq, 1);

    assert.deepEqual(loadEvents(reopened, 1).map((e) => e.seq), [1, 2, 3]);
    reopened.close();
  });
});
