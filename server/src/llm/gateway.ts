import type { ModelEntry, ModelRoute } from "./models.ts";
import type { ProviderTable } from "./providers.ts";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type Delta = { kind: "content" | "reasoning"; text: string };

export type Usage = { promptTokens?: number; completionTokens?: number; totalTokens?: number };

export type KoReason = "timeout" | "http_error" | "budget_exhausted" | "empty" | "aborted";

export type RunResult =
  | {
      status: "finished";
      content: string;
      reasoningChars: number;
      usage?: Usage;
      route: ModelRoute;
      attempts: number;
      ms: number;
    }
  | {
      status: "ko";
      reason: KoReason;
      detail: string;
      route: ModelRoute;
      attempts: number;
      ms: number;
      partialContent: string;
    };

export type RunFighterOptions = {
  entry: ModelEntry;
  messages: ChatMessage[];
  maxTokens: number;
  deadlineMs: number;
  signal?: AbortSignal;
  onDelta?: (delta: Delta) => void;
  onRetry?: (attempt: number, route: ModelRoute) => void;
  fetchImpl?: typeof fetch;
  providers?: ProviderTable;
};

const MAX_ATTEMPTS = 2;

type AttemptResult =
  | { ok: true; content: string; reasoningChars: number; usage?: Usage }
  | { ok: false; reason: KoReason; detail: string; partialContent: string; retryable: boolean };

type Chunk = {
  error?: unknown;
  usage?: Usage;
  content: string;
  reasoning: string;
  finishReason?: string;
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const num = (v: unknown) => (typeof v === "number" ? v : undefined);

const str = (v: unknown) => (typeof v === "string" ? v : "");

function parseChunk(json: unknown): Chunk {
  const chunk: Chunk = { content: "", reasoning: "" };
  if (!isRecord(json)) return chunk;
  if (json.error !== undefined) chunk.error = json.error;
  if (isRecord(json.usage)) {
    chunk.usage = {
      promptTokens: num(json.usage.prompt_tokens),
      completionTokens: num(json.usage.completion_tokens),
      totalTokens: num(json.usage.total_tokens),
    };
  }
  const choice = Array.isArray(json.choices) ? json.choices[0] : undefined;
  if (isRecord(choice)) {
    if (typeof choice.finish_reason === "string") chunk.finishReason = choice.finish_reason;
    if (isRecord(choice.delta)) {
      chunk.content = str(choice.delta.content);
      chunk.reasoning = str(choice.delta.reasoning_content) || str(choice.delta.reasoning);
    }
  }
  return chunk;
}

const errorDetail = (e: unknown) => (e instanceof Error ? `${e.name}: ${e.message}` : String(e));

async function attemptRoute(
  opts: RunFighterOptions,
  providers: ProviderTable,
  route: ModelRoute,
  signal: AbortSignal,
  abortReason: () => KoReason | null,
): Promise<AttemptResult> {
  const provider = providers[route.provider];
  if (!provider) throw new Error(`unknown provider: ${route.provider}`);
  const doFetch = opts.fetchImpl ?? fetch;

  let content = "";
  let reasoningChars = 0;
  let usage: Usage | undefined;
  let finishReason: string | undefined;
  let sawDone = false;
  let streamError: unknown;
  let callbackError: { error: unknown } | undefined;

  const deliver = (delta: Delta) => {
    try {
      opts.onDelta?.(delta);
    } catch (error) {
      callbackError = { error };
      throw error;
    }
  };

  const fail =(reason: KoReason, detail: string, retryable: boolean): AttemptResult => ({
    ok: false,
    reason,
    detail,
    partialContent: content,
    retryable: retryable && content === "",
  });

  const handleLine = (raw: string) => {
    const line = raw.trim();
    if (!line.startsWith("data:")) return;
    const data = line.slice(5).trim();
    if (data === "[DONE]") {
      sawDone = true;
      return;
    }
    let json: unknown;
    try {
      json = JSON.parse(data);
    } catch {
      return;
    }
    const chunk = parseChunk(json);
    if (chunk.error !== undefined) streamError = chunk.error;
    if (chunk.usage) usage = chunk.usage;
    if (chunk.finishReason) finishReason = chunk.finishReason;
    if (chunk.reasoning) {
      reasoningChars += chunk.reasoning.length;
      deliver({ kind: "reasoning", text: chunk.reasoning });
    }
    if (chunk.content) {
      content += chunk.content;
      deliver({ kind: "content", text: chunk.content });
    }
  };

  try {
    const res = await doFetch(`${provider.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${provider.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: route.model,
        messages: opts.messages,
        max_tokens: opts.maxTokens,
        stream: true,
        stream_options: { include_usage: true },
        ...provider.reasoningBody(route.reasoning),
      }),
      signal,
    });

    if (!res.ok) {
      const body = (await res.text().catch(() => "")).slice(0, 300);
      const retryable = res.status >= 500 || res.status === 429;
      return fail("http_error", `HTTP ${res.status} ${body}`.trim(), retryable);
    }
    if (!res.body) return fail("http_error", "response has no body", true);

    const decoder = new TextDecoder();
    let buf = "";
    for await (const bytes of res.body) {
      buf += decoder.decode(bytes, { stream: true });
      let i: number;
      while ((i = buf.indexOf("\n")) >= 0) {
        handleLine(buf.slice(0, i));
        buf = buf.slice(i + 1);
      }
      if (streamError !== undefined) break;
    }
    handleLine(buf);
  } catch (e) {
    // a throwing caller callback is our bug, not a provider failure, so never retry it as one
    if (callbackError) throw callbackError.error;
    const aborted = abortReason();
    if (aborted) return fail(aborted, aborted, false);
    return fail("http_error", errorDetail(e), true);
  }

  if (streamError !== undefined) {
    return fail("http_error", `stream error: ${JSON.stringify(streamError).slice(0, 300)}`, true);
  }
  if (content === "") {
    const budget =
      finishReason === "length" ||
      (usage?.completionTokens !== undefined && usage.completionTokens >= opts.maxTokens);
    if (budget) {
      // a retry sends the same model and budget, so it burns a capped request for the same result
      return fail("budget_exhausted", `no content within ${opts.maxTokens} tokens`, false);
    }
    return fail("empty", `stream ended with no content (finish_reason ${finishReason ?? "none"})`, true);
  }
  if (finishReason === undefined && !sawDone) {
    return fail("http_error", "stream ended before completion", true);
  }
  return { ok: true, content, reasoningChars, usage };
}

export async function runFighter(opts: RunFighterOptions): Promise<RunResult> {
  const t0 = performance.now();
  const providers = opts.providers ?? (await import("./env-providers.ts")).envProviders;
  for (const route of opts.entry.routes) {
    if (!providers[route.provider]) throw new Error(`unknown provider: ${route.provider}`);
  }

  const deadline = AbortSignal.timeout(opts.deadlineMs);
  const signal = opts.signal ? AbortSignal.any([deadline, opts.signal]) : deadline;
  const abortReason = (): KoReason | null =>
    opts.signal?.aborted ? "aborted" : deadline.aborted ? "timeout" : null;

  let route = opts.entry.routes[0];
  let attempts = 0;
  let last: Extract<AttemptResult, { ok: false }> | undefined;

  while (attempts < MAX_ATTEMPTS) {
    const early = abortReason();
    if (early) {
      last = { ok: false, reason: early, detail: early, partialContent: "", retryable: false };
      break;
    }
    route = opts.entry.routes[Math.min(attempts, opts.entry.routes.length - 1)] ?? route;
    if (attempts > 0) opts.onRetry?.(attempts + 1, route);
    attempts++;
    const result = await attemptRoute(opts, providers, route, signal, abortReason);
    if (result.ok) {
      return {
        status: "finished",
        content: result.content,
        reasoningChars: result.reasoningChars,
        usage: result.usage,
        route,
        attempts,
        ms: Math.round(performance.now() - t0),
      };
    }
    last = result;
    if (!result.retryable) break;
  }

  return {
    status: "ko",
    reason: last?.reason ?? "empty",
    detail: last?.detail ?? "no attempt ran",
    route,
    attempts,
    ms: Math.round(performance.now() - t0),
    partialContent: last?.partialContent ?? "",
  };
}
