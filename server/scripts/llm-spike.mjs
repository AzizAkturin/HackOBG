import { writeFileSync } from "node:fs";

const [outPath, configPath] = process.argv.slice(2);

const providers = {
  nvidia: {
    baseUrl: "https://integrate.api.nvidia.com/v1",
    key: process.env.NVIDIA_API_KEY,
    runs: 2,
    models: [
      "nvidia/nemotron-3.5-bolt-e4b",
      "poolside/laguna-xs-2.1",
      "nvidia/nemotron-3.5-lightning-30b-a3b",
      "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
      "minimaxai/minimax-m3.1-flash",
      "stepfun-ai/step-5-preview",
      "meta/llama-3.2-90b-vision-instruct",
      "meta/muse-glimmer-30b",
      "google/gemma-4-31b-it",
      "nvidia/nemotron-3.5-super-vl-120b-a12b",
      "nvidia/nemotron-3-ultra-550b-a55b",
      "mistralai/mistral-large-4-1t-a52b",
    ],
  },
  openrouter: {
    baseUrl: "https://openrouter.ai/api/v1",
    key: process.env.OPENROUTER_API_KEY,
    runs: 1,
    models: [
      "baidu/ernie-5.5-flash-preview:free",
      "cohere/north-mini-code:free",
      "dots-studio/dots-3-note-preview:free",
      "google/gemma-4-26b-a4b-it:free",
      "google/gemma-4-31b-it:free",
      "inclusionai/ling-3.2-flash:free",
      "liquid/lfm-3-1.7b:free",
      "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
      "nvidia/nemotron-3-ultra-550b-a55b:free",
      "nvidia/nemotron-3.5-lightning:free",
      "nvidia/nemotron-3.5-super-vl:free",
      "particle-ai/particle-1:free",
      "recursive/flint-v1.0:free",
      "thinkingmachines/inkling-2-small:free",
    ],
  },
};

if (configPath) {
  const cfg = JSON.parse((await import("node:fs")).readFileSync(configPath, "utf8"));
  for (const k of Object.keys(providers)) Object.assign(providers[k], cfg[k]);
}

const TASK = `You are a fighter in an AI arena. Task: design a tiny CLI tool that deduplicates lines in a log file while keeping the first occurrence, and explain your approach in about 200 words with a short code sketch. Finish with one line that starts with "PITCH:" selling your solution in one sentence.`;

async function run(provider, p, model, attempt, extra = {}) {
  const t0 = performance.now();
  const r = { provider, model, attempt, variant: extra.__label ?? "default", status: null, ttftMs: null, firstContentMs: null, totalMs: null, contentChars: 0, reasoningChars: 0, usage: null, hasPitch: false, error: null, rate: {} };
  try {
    const res = await fetch(`${p.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${p.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: [{ role: "user", content: TASK }], max_tokens: 1500, stream: true, stream_options: { include_usage: true }, ...Object.fromEntries(Object.entries(extra).filter(([k]) => k !== "__label")) }),
      signal: AbortSignal.timeout(150000),
    });
    r.status = res.status;
    for (const [k, v] of res.headers) if (/ratelimit|retry-after/i.test(k)) r.rate[k] = v;
    if (!res.ok) { r.error = (await res.text()).slice(0, 200); return r; }
    const decoder = new TextDecoder();
    let buf = "", content = "";
    for await (const chunk of res.body) {
      buf += decoder.decode(chunk, { stream: true });
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") continue;
        let j; try { j = JSON.parse(data); } catch { continue; }
        if (j.error) r.error = JSON.stringify(j.error).slice(0, 200);
        if (j.usage) r.usage = j.usage;
        const d = j.choices?.[0]?.delta ?? {};
        const reasoning = d.reasoning_content ?? d.reasoning ?? "";
        if ((d.content || reasoning) && r.ttftMs === null) r.ttftMs = Math.round(performance.now() - t0);
        if (d.content && r.firstContentMs === null) r.firstContentMs = Math.round(performance.now() - t0);
        content += d.content ?? "";
        r.reasoningChars += reasoning.length;
      }
    }
    r.contentChars = content.length;
    r.hasPitch = /PITCH:/i.test(content);
  } catch (e) {
    r.error = `${e.name}: ${e.message}`.slice(0, 200);
  } finally {
    r.totalMs = Math.round(performance.now() - t0);
  }
  return r;
}

async function drain(provider, p, results) {
  const jobs = [];
  for (let a = 1; a <= p.runs; a++) for (const m of p.models) for (const v of p.variants ?? [{}]) jobs.push([m, a, v]);
  const worker = async () => {
    while (jobs.length) {
      const [m, a, v] = jobs.shift();
      const r = await run(provider, p, m, a, v);
      results.push(r);
      console.log(provider, r.variant, r.status, `${r.totalMs}ms`, `content=${r.contentChars}`, `reasoning=${r.reasoningChars}`, r.hasPitch ? "PITCH" : "-", m, r.error ?? "");
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
}

const results = [];
await Promise.all(Object.entries(providers).map(([name, p]) => drain(name, p, results)));
writeFileSync(outPath, JSON.stringify(results, null, 2));
