# Deploying

Two services: the API server on Railway (always on, holds the fight streams and SQLite) and the static web app on Vercel. Both build from the repo root.

## Server (Railway)

`railway.json` sets the build (`pnpm install --filter server...`), start (`pnpm --filter server start`) and health check (`GET /live`). Node 24+ is required (`engines` in `package.json`).

1. Create a service from this repo, root directory `/`.
2. Add a volume mounted at `/data`.
3. Set the variables below. Railway provides `PORT`.

| Variable | Value |
| --- | --- |
| `DB_PATH` | `/data/wab.sqlite` |
| `WEB_ORIGIN` | The Vercel URL, e.g. `https://wab.vercel.app`. Comma-separate extra origins (previews, custom domain). The first one is the sign-in (SIWE) domain. |
| `OPENROUTER_API_KEY` | `sk-or-...` (fights run on OpenRouter) |
| `NVIDIA_API_KEY` | `nvapi-...` |
| `OPERATOR_PK`, `OPERATOR_ADDRESS`, `DRIP_PK`, `DRIP_ADDRESS` | Project wallets, see `docs/blockchain.md` |
| `MONAD_RPC_HTTP` | A private RPC endpoint (the public one is capped at 20 req/s) |
| `FIGHT_DEFAULT_MODELS` | Optional. Two model ids the setup screen starts with. Default `anthropic/claude-sonnet-5.5,openai/gpt-6.1-sol` |
| `FIGHT_MAX_TOKENS`, `FIGHT_SECONDS` | Optional. Per-fighter caps, default `1500` and `60` |

The full list with defaults is in `server/.env.example`. The server refuses to start if a required variable is missing or a default model id is unknown.

## Web (Vercel)

`vercel.json` installs with pnpm, builds `web`, serves `web/dist` and rewrites every path to `index.html`.

1. Import the repo, root directory `/`, framework preset "Other".
2. Set `VITE_API_URL` to the Railway public URL (e.g. `https://wab-server.up.railway.app`). The production build fails without it.
3. Add the Vercel URL to the server's `WEB_ORIGIN` and redeploy the server.

## Costs

Each match runs at most 3 rounds of 2 model calls. Matches only start when someone presses Start, so an idle site spends nothing. With the default paid models and caps, a full match is at most about $0.09 of OpenRouter credit.
