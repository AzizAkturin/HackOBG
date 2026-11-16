export type ProviderId = "nvidia" | "openrouter";

export type ReasoningSetting = "default" | "off" | "low";

export type ProviderConfig = {
  baseUrl: string;
  apiKey: string;
  reasoningBody: (setting: ReasoningSetting) => Record<string, unknown>;
};

export type ProviderTable = Record<ProviderId, ProviderConfig>;

export type ProviderEndpoints = Record<ProviderId, { baseUrl: string; apiKey: string }>;

const reasoningBodies: Record<ProviderId, Record<ReasoningSetting, Record<string, unknown>>> = {
  nvidia: {
    default: {},
    off: { chat_template_kwargs: { enable_thinking: false } },
    low: { reasoning_effort: "low" },
  },
  openrouter: {
    default: {},
    off: { reasoning: { enabled: false } },
    low: { reasoning: { effort: "low" } },
  },
};

export function buildProviders(endpoints: ProviderEndpoints): ProviderTable {
  const build = (id: ProviderId): ProviderConfig => ({
    baseUrl: endpoints[id].baseUrl.replace(/\/+$/, ""),
    apiKey: endpoints[id].apiKey,
    reasoningBody: (setting) => reasoningBodies[id][setting],
  });
  return { nvidia: build("nvidia"), openrouter: build("openrouter") };
}
