import type { ChatMessage } from "../llm/gateway.ts";
import type { FightLimits, FightTask, FighterSpec } from "./types.ts";

export const PITCH_MAX_WORDS = 120;
export const MEMORY_LIMIT = 5;

const rules = (limits: FightLimits) =>
  [
    "Rules of the fight:",
    `- Stay under ${limits.maxTokens} tokens in total. Anything past that is cut off.`,
    `- You have ${limits.fightSeconds} seconds. Finish before time runs out.`,
    `- End with a section that starts on its own line with "PITCH:". It is ${PITCH_MAX_WORDS} words or less and sells your result to the crowd.`,
    "- Never name yourself or your model in the pitch.",
  ].join("\n");

export function buildMessages(fighter: FighterSpec, task: FightTask, limits: FightLimits): ChatMessage[] {
  const memories = fighter.memories
    .map((m) => m.trim())
    .filter(Boolean)
    .slice(-MEMORY_LIMIT);
  const career = fighter.careerSummary?.trim();

  const sections = [fighter.persona.trim()];
  if (memories.length > 0) sections.push(["Your recent fights:", ...memories.map((m) => `- ${m}`)].join("\n"));
  if (career) sections.push(`Your career so far:\n${career}`);
  sections.push(rules(limits));

  return [
    { role: "system", content: sections.join("\n\n") },
    { role: "user", content: task.prompt },
  ];
}

const PITCH_MARKER = /^[ \t]*(?:#{1,6}[ \t]*)?(?:\*\*|__)?pitch(?:\*\*|__)?[ \t]*:(?:\*\*|__)?/gim;

const words = (text: string) => text.split(/\s+/).filter(Boolean);

export const lastWords = (text: string, n: number) => words(text).slice(-n).join(" ");

export function splitPitch(content: string): { result: string; pitch: string | null } {
  let last: RegExpExecArray | undefined;
  for (const m of content.matchAll(PITCH_MARKER)) last = m;
  if (!last) return { result: content.trim(), pitch: null };
  const pitch = words(content.slice(last.index + last[0].length)).slice(0, PITCH_MAX_WORDS).join(" ");
  return { result: content.slice(0, last.index).trim(), pitch: pitch === "" ? null : pitch };
}
