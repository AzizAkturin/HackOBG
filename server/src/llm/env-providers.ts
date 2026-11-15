import { env } from "../env.ts";
import { buildProviders } from "./providers.ts";

export const envProviders = buildProviders({
  nvidia: { baseUrl: env.NVIDIA_BASE_URL, apiKey: env.NVIDIA_API_KEY },
  openrouter: { baseUrl: env.OPENROUTER_BASE_URL, apiKey: env.OPENROUTER_API_KEY },
});
