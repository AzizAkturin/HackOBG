# Fighter models

Every fighter runs on one model from one of two providers. Both use OpenAI-compatible chat completions with streaming.

| Provider | Base URL | Env var | Limits we measured |
| --- | --- | --- | --- |
| NVIDIA Build | `https://integrate.api.nvidia.com/v1` | `NVIDIA_API_KEY` | Free. No rate-limit headers and no 429s across 36 calls (4 at a time). Its daily cap is unknown |
| OpenRouter | `https://openrouter.ai/api/v1` | `OPENROUTER_API_KEY` | `:free` models cost $0. The account has $10 of credit, which raises the free-model cap from 50 to **1,000 requests/day**. Check `GET /api/v1/key`, field `free_model_daily_requests` |

All numbers come from `pnpm llm-spike <out.json> [config.json]` (`server/scripts/llm-spike.mjs`), run on 2026-11-15. Each call is one realistic fighter task (a ~200-word answer with a code sketch, ending in a `PITCH:` line) with `max_tokens: 1500`, streamed with 4 calls in flight per provider. A model **qualifies** only if it streamed visible answer text that contains `PITCH:` and didn't error. NVIDIA models ran twice and OpenRouter models once, so a single OpenRouter result is thin evidence. Times are total wall-clock and swing about 2x between runs of the same model. NVIDIA rotates what it hosts, so rerun the spike on demo day.

## The reasoning gotcha

Most of these are reasoning models. With default settings they spend the **entire** `max_tokens` budget on reasoning and return no answer: every empty run reported `reasoning_tokens` ≈ `completion_tokens` = 1500. The fix is a reasoning setting, and it differs by provider and by model:

| Setting | NVIDIA Build | OpenRouter | Measured result |
| --- | --- | --- | --- |
| Off | `chat_template_kwargs: { enable_thinking: false }` | `reasoning: { enabled: false }` | Works for Nemotron, dots and ling: full answers in 1 to 21 s. **Ignored by Mistral Large 4** |
| Low | `reasoning_effort: "low"` | `reasoning: { effort: "low" }` | **Mostly ignored.** Nemotron Lightning, Nemotron Super-VL (NVIDIA), dots and ling still burn the whole budget. Works for Mistral Large 4 and Nemotron Nano Omni (OpenRouter) |

So the gateway needs a per-model reasoning setting in its model table, not one class-wide flag. A Middleweight "low reasoning" class can't depend on `effort: "low"`. Either run reasoning off or give it a bigger token budget.

## Qualified roster

| Model | Provider | Reasoning setting | Time | Suggested class |
| --- | --- | --- | --- | --- |
| `nvidia/nemotron-3.5-bolt-e4b` | NVIDIA | none needed | 2.7 s, 2.9 s | Flyweight |
| `poolside/laguna-xs-2.1` | NVIDIA | none needed | 6.3 s, 8.0 s | Flyweight |
| `nvidia/nemotron-3.5-lightning-30b-a3b` | NVIDIA | off | 2.1 s | Flyweight |
| `nvidia/nemotron-3.5-lightning:free` | OpenRouter | off | 1.1 s | Flyweight |
| `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning` | NVIDIA | off | 7.1 s | Flyweight |
| `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` | OpenRouter | off or low | 6.3 s / 8.4 s | Flyweight |
| `baidu/ernie-5.5-flash-preview:free` | OpenRouter | none needed | 4.0 s | Middleweight |
| `cohere/north-mini-code:free` | OpenRouter | none needed | 7.2 s | Flyweight |
| `particle-ai/particle-1:free` | OpenRouter | none needed | 5.4 s | Middleweight |
| `recursive/flint-v1.0:free` | OpenRouter | none needed | 5.3 s | Flyweight |
| `dots-studio/dots-3-note-preview:free` | OpenRouter | off | 4.7 s | Middleweight |
| `inclusionai/ling-3.2-flash:free` | OpenRouter | off | 21 s | Middleweight |
| `nvidia/nemotron-3.5-super-vl-120b-a12b` | NVIDIA | off | 5.1 s | Middleweight |
| `nvidia/nemotron-3.5-super-vl:free` | OpenRouter | off | 3.4 s | Middleweight |
| `google/gemma-4-31b-it` | NVIDIA | none needed | 46 s, 23 s | Middleweight |
| `meta/llama-3.2-90b-vision-instruct` | NVIDIA | none needed | 48 s, 62 s | Middleweight |
| `nvidia/nemotron-3-ultra-550b-a55b` | NVIDIA | none needed | 31 s, 29 s | Heavyweight |
| `nvidia/nemotron-3-ultra-550b-a55b:free` | OpenRouter | none needed | 30 s | Heavyweight |
| `mistralai/mistral-large-4-1t-a52b` | NVIDIA | low | 36 s | Heavyweight |

The same model on both providers (Nemotron Lightning, Nano Omni, Super-VL, Ultra) gives the gateway a fallback. If one provider fails, retry the call on the other.

Suggested classes group by active parameter count (see [openrouter-models.md](openrouter-models.md)), not by answer quality. Flyweight's 30 to 60 s fight time rules out anything slower than about 10 s per call.

## Did not qualify

| Model | Provider | What happened |
| --- | --- | --- |
| `minimaxai/minimax-m3.1-flash` | NVIDIA | `503 content safety screening is temporarily unavailable`, both runs. It answered a short probe earlier the same day, so this may be temporary |
| `stepfun-ai/step-5-preview` | NVIDIA | 75 to 150 s per call, or timed out. Too slow |
| `meta/muse-glimmer-30b` | NVIDIA | 70 to 150 s per call, or timed out. Too slow |
| `google/gemma-4-31b-it:free`, `google/gemma-4-26b-a4b-it:free` | OpenRouter | `429 temporarily rate-limited upstream`. Use Gemma through NVIDIA instead |
| `thinkingmachines/inkling-2-small:free` | OpenRouter | `403 only available on agentic harnesses` |
| `liquid/lfm-3-1.7b:free` | OpenRouter | Answered but never wrote the `PITCH:` line (5,186 chars of reasoning) |
| `deepseek-ai/deepseek-v4.1-flash`, `openai/gpt-oss-20b`, `z-ai/glm-5.3-flash` | NVIDIA | Accepted the connection and never answered within 150 s |

NVIDIA's `GET /v1/models` lists 83 ids, but 40 of them return `404 Function not found` on chat completions (for example `moonshotai/kimi-k2.6`, `meta/llama2-70b`, `mistralai/mistral-large-2-instruct`). Another 28 are embedding, safety-guard, parse or translation models that can't fight. `meta/llama-guard-4-12b` or `nvidia/nemotron-3.5-content-safety` could moderate custom fighters later.
