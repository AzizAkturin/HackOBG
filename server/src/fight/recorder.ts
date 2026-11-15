import type { EventEnvelope, FightEvent } from "@fightclub/shared";
import type { Db } from "../db/index.ts";

export function createRecorder(
  db: Db,
  roundId: number,
  listener?: (envelope: EventEnvelope) => void,
  now: () => number = Date.now,
) {
  const stored = db
    .prepare("SELECT COALESCE(MAX(seq), 0) AS seq, COALESCE(MAX(t_ms), 0) AS t_ms FROM round_events WHERE round_id = ?")
    .get(roundId) as { seq: number; t_ms: number };
  const insert = db.prepare(
    "INSERT INTO round_events (round_id, seq, t_ms, fighter_idx, kind, payload_json) VALUES (?, ?, ?, ?, ?, ?)",
  );
  const startedAt = now();
  let seq = stored.seq;

  return function emit(event: FightEvent): EventEnvelope {
    const envelope: EventEnvelope = {
      roundId,
      seq: ++seq,
      tMs: stored.t_ms + Math.max(0, now() - startedAt),
      event,
    };
    const fighter = "fighter" in event ? event.fighter : null;
    insert.run(roundId, envelope.seq, envelope.tMs, fighter, event.kind, JSON.stringify(event));
    listener?.(envelope);
    return envelope;
  };
}

export function loadEvents(db: Db, roundId: number, afterSeq = 0): EventEnvelope[] {
  const rows = db
    .prepare("SELECT seq, t_ms, payload_json FROM round_events WHERE round_id = ? AND seq > ? ORDER BY seq")
    .all(roundId, afterSeq) as { seq: number; t_ms: number; payload_json: string }[];
  return rows.map((r) => ({
    roundId,
    seq: r.seq,
    tMs: r.t_ms,
    event: JSON.parse(r.payload_json) as FightEvent,
  }));
}
