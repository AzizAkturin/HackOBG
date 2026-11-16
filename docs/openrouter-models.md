# OpenRouter roster by weight class

This is every model OpenRouter serves for free on 2026-11-15, sorted into our three weight classes. [models.md](models.md) has the streaming test method and the NVIDIA Build side.

## What "free" means for us

- A `:free` model id costs $0 per token. Our key has $10 of credit, which raises the free-model cap from 50 to **1,000 requests per day**. The credit is not spent on free models. After the test runs, `GET /api/v1/key` showed `usage: 0`.
- One round is about 13 requests (4 fighters, 4 memory notes, 1 judge, plus retries), so 1,000 requests is about 75 rounds a day across all classes. NVIDIA Build has no cap that we've hit, so it should carry most house rounds.
- Free models can be rate-limited upstream when they're busy. Both Gemma models returned `429 temporarily rate-limited upstream` during our test.
- Some free models may keep prompts for training (LiquidAI says so in its listing). Never send user secrets to a fighter.

## How classes are assigned

[product.md](product.md#2-weight-classes) groups fighters by capability. For mixture-of-experts models, **active** parameters per token track capability and speed better than total size, so the bands are:

| Class | Active parameters | Reasoning in class config | Why |
| --- | --- | --- | --- |
| Flyweight | about 4B or less | off | Fast and cheap, 30 to 60 s fights |
| Middleweight | about 12B to 16B | off (see below) | Mid-size, 1 to 2 min fights |
| Heavyweight | about 50B or more, or a vendor's flagship | default or low | Strongest available, 2 to 5 min fights |

Middleweight is also set to reasoning off because `effort: "low"` was ignored by most models we tested, so they burned the whole budget thinking ([models.md](models.md#the-reasoning-gotcha)). Turn it back on only for a model that has passed the streaming test with it.

"Tested" below means one streamed fighter task, 4 calls in flight, `max_tokens: 1500`. One run per model is thin evidence, so treat the times as rough.

## Flyweight

| Model id | Maker | Size (active / total) | Context | Inputs | Tested | Reasoning setting |
| --- | --- | --- | --- | --- | --- | --- |
| `nvidia/nemotron-3.5-lightning:free` | NVIDIA | 3B / 30B MoE | 1M | text | Pass, 1.1 s | off |
| `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` | NVIDIA | 3B / 30B MoE | 256K | text, image, audio, video | Pass, 6.3 s off and 8.4 s low | off |
| `cohere/north-mini-code:free` | Cohere | 3B / 30B MoE | 256K | text | Pass, 7.2 s | default |
| `recursive/flint-v1.0:free` | Recursive | 2.5B / 40B MoE | 256K | text | Pass, 5.3 s | default |
| `google/gemma-4-26b-a4b-it:free` | Google | 3.8B / 25B MoE | 256K | text, image, video | Not run (upstream 429) | untested |
| `liquid/lfm-3-1.7b:free` | LiquidAI | 1.7B dense | 256K | text | Fail with default reasoning (no `PITCH:` line) | try off |

Cohere North Mini Code and Flint are tuned for coding agents, so they should be strong on code tasks and possibly weaker on creative ones. Both Nemotron models are also on NVIDIA Build, so the gateway can fall back between providers.

## Middleweight

| Model id | Maker | Size (active / total) | Context | Inputs | Tested | Reasoning setting |
| --- | --- | --- | --- | --- | --- | --- |
| `nvidia/nemotron-3.5-super-vl:free` | NVIDIA | 12B / 120B MoE | 1M | text, image, video | Pass, 3.4 s off. Low passed but spent 4K chars thinking | off |
| `dots-studio/dots-3-note-preview:free` | Dots Studio | 16B / 280B MoE | 512K | text, image | Pass, 4.7 s off. Fails on default and low | off |
| `particle-ai/particle-1:free` | Particle AI | DeepSeek V4.1 Flash base (about 16B active) | 1M | text, image | Pass, 5.4 s | default |
| `inclusionai/ling-3.2-flash:free` | inclusionAI | not published in the listing | 1M | text, image | Pass, 21 s off. Fails on default and low | off |
| `google/gemma-4-31b-it:free` | Google | 31B dense | 256K | text, image, video | Not run (upstream 429). The NVIDIA copy passes | use NVIDIA |

Ling's size isn't published, so its class is a guess from its speed (21 s, the slowest pass here) and its "Flash" name. Particle-1 is a coding model, like the Flyweight coders.

## Heavyweight

| Model id | Maker | Size (active / total) | Context | Inputs | Tested | Reasoning setting |
| --- | --- | --- | --- | --- | --- | --- |
| `nvidia/nemotron-3-ultra-550b-a55b:free` | NVIDIA | 55B / 550B MoE | 1M | text | Pass, 30 s | default |
| `baidu/ernie-5.5-flash-preview:free` | Baidu | 280B total, active not published | 1M | text | Pass, 4.0 s | default |

Heavyweight is thin on free models, with only two that pass. ERNIE is a judgment call. It's Baidu's newest flagship, but it answered in 4 s, so it may really be a Middleweight. Add NVIDIA's `mistralai/mistral-large-4-1t-a52b` (reasoning low, 36 s) to make three, or one paid model from the next section.

## Free but unusable

| Model id | Why |
| --- | --- |
| `thinkingmachines/inkling-2-small:free` (17B / 594B MoE) | `403 only available on agentic harnesses`. OpenRouter blocks it outside listed coding apps |
| `openrouter/free` | A router that picks a random free model per request. A fighter must stay on one model, so it can't be a fighter |
| `google/lyria-3-clip-preview`, `google/lyria-3-pro-preview` | Music generation, billed per clip, not free text models |

## If Heavyweight needs paid models

These are cheap paid models from major labs, at OpenRouter's listed prices (USD per million tokens). **None has been tested yet.** Worst-case cost assumes a Heavyweight round with 4 fighters that each use the full 12,000 output tokens plus about 2,000 input tokens, before the judge. This is an estimate, not a measurement.

| Model id | Input $/M | Output $/M | Worst-case per round | Rounds per $10 |
| --- | --- | --- | --- | --- |
| `z-ai/glm-5.3-flash` | 0.04 | 0.08 | under $0.01 | over 1,000 |
| `qwen/qwen3.7-flash` | 0.03 | 0.13 | under $0.01 | over 1,000 |
| `deepseek/deepseek-v4.1-flash` | 0.05 | 0.20 | about $0.01 | about 1,000 |
| `anthropic/claude-haiku-5.5` | 0.10 | 0.50 | about $0.025 | about 400 |
| `openai/gpt-6-luna` | 0.10 | 0.50 | about $0.025 | about 400 |
| `minimax/minimax-m3` | 0.30 | 1.20 | about $0.06 | about 170 |

Paid models also get far fewer upstream 429s than `:free` ones. Two of these (`z-ai/glm-5.3-flash`, `deepseek-v4.1-flash`) hung on NVIDIA's free endpoint. On OpenRouter they're paid, so they're likely to answer, but that's a guess until we test them. Spending credit is a team decision, so the registry has no paid models in it.

## Refreshing this list

The free lineup changes weekly. Three of these models were added in the last week. Listing models is free and doesn't count toward the daily cap:

```
curl -s https://openrouter.ai/api/v1/models | jq -r '.data[] | select(.id | endswith(":free")) | .id'
```

Then stream-test any new id with `pnpm llm-spike <out.json> <config.json>`. Each model costs one request from the daily cap.
