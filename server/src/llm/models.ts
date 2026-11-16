import type { ProviderId, ReasoningSetting } from "./providers.ts";

export type WeightClass = "flyweight" | "middleweight" | "heavyweight";

export type ModelRoute = {
  provider: ProviderId;
  model: string;
  reasoning: ReasoningSetting;
};

export type ModelEntry = {
  id: string;
  label: string;
  maker: string;
  weightClass: WeightClass;
  routes: [ModelRoute, ...ModelRoute[]];
};

const nvidia = (model: string, reasoning: ReasoningSetting = "default"): ModelRoute => ({
  provider: "nvidia",
  model,
  reasoning,
});

const openrouter = (model: string, reasoning: ReasoningSetting = "default"): ModelRoute => ({
  provider: "openrouter",
  model,
  reasoning,
});

export const MODELS: readonly ModelEntry[] = [
  {
    id: "nemotron-3.5-bolt-e4b",
    label: "Nemotron Bolt",
    maker: "NVIDIA",
    weightClass: "flyweight",
    routes: [nvidia("nvidia/nemotron-3.5-bolt-e4b")],
  },
  {
    id: "laguna-xs-2.1",
    label: "Laguna XS",
    maker: "Poolside",
    weightClass: "flyweight",
    routes: [nvidia("poolside/laguna-xs-2.1")],
  },
  {
    id: "nemotron-3.5-lightning",
    label: "Nemotron Lightning",
    maker: "NVIDIA",
    weightClass: "flyweight",
    routes: [
      nvidia("nvidia/nemotron-3.5-lightning-30b-a3b", "off"),
      openrouter("nvidia/nemotron-3.5-lightning:free", "off"),
    ],
  },
  {
    id: "nemotron-3-nano-omni",
    label: "Nemotron Nano Omni",
    maker: "NVIDIA",
    weightClass: "flyweight",
    routes: [
      nvidia("nvidia/nemotron-3-nano-omni-30b-a3b-reasoning", "off"),
      openrouter("nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", "off"),
    ],
  },
  {
    id: "ernie-5.5-flash",
    label: "ERNIE Flash",
    maker: "Baidu",
    weightClass: "middleweight",
    routes: [openrouter("baidu/ernie-5.5-flash-preview:free")],
  },
  {
    id: "north-mini-code",
    label: "North Mini Code",
    maker: "Cohere",
    weightClass: "flyweight",
    routes: [openrouter("cohere/north-mini-code:free")],
  },
  {
    id: "particle-1",
    label: "Particle 1",
    maker: "Particle AI",
    weightClass: "middleweight",
    routes: [openrouter("particle-ai/particle-1:free")],
  },
  {
    id: "flint-v1.0",
    label: "Flint",
    maker: "Recursive",
    weightClass: "flyweight",
    routes: [openrouter("recursive/flint-v1.0:free")],
  },
  {
    id: "dots-3-note-preview",
    label: "dots Note",
    maker: "dots.studio",
    weightClass: "middleweight",
    routes: [openrouter("dots-studio/dots-3-note-preview:free", "off")],
  },
  {
    id: "ling-3.2-flash",
    label: "Ling Flash",
    maker: "InclusionAI",
    weightClass: "middleweight",
    routes: [openrouter("inclusionai/ling-3.2-flash:free", "off")],
  },
  {
    id: "nemotron-3.5-super-vl",
    label: "Nemotron Super-VL",
    maker: "NVIDIA",
    weightClass: "middleweight",
    routes: [
      nvidia("nvidia/nemotron-3.5-super-vl-120b-a12b", "off"),
      openrouter("nvidia/nemotron-3.5-super-vl:free", "off"),
    ],
  },
  {
    id: "gemma-4-31b-it",
    label: "Gemma 4 31B",
    maker: "Google",
    weightClass: "middleweight",
    routes: [nvidia("google/gemma-4-31b-it")],
  },
  {
    id: "llama-3.2-90b-vision-instruct",
    label: "Llama 3.2 90B Vision",
    maker: "Meta",
    weightClass: "middleweight",
    routes: [nvidia("meta/llama-3.2-90b-vision-instruct")],
  },
  {
    id: "nemotron-3-ultra",
    label: "Nemotron Ultra",
    maker: "NVIDIA",
    weightClass: "heavyweight",
    routes: [
      nvidia("nvidia/nemotron-3-ultra-550b-a55b"),
      openrouter("nvidia/nemotron-3-ultra-550b-a55b:free"),
    ],
  },
  {
    id: "mistral-large-4",
    label: "Mistral Large 4",
    maker: "Mistral",
    weightClass: "heavyweight",
    routes: [nvidia("mistralai/mistral-large-4-1t-a52b", "low")],
  },
];

export function getModel(id: string): ModelEntry {
  const entry = MODELS.find((m) => m.id === id);
  if (!entry) throw new Error(`unknown model id: ${id}`);
  return entry;
}
