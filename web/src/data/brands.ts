// Robot paint schemes keyed by the fighter's model provider.
// Colours only: no logos or wordmarks are drawn.

export interface Brand {
  label: string
  /** main armour */
  primary: string
  /** trim, fists, chest plate */
  secondary: string
  /** visor eyes and waist core */
  glow: string
  /** readable text colour on the dark UI */
  ui: string
  /** armour finish: 0 = glossy, 1 = matte */
  roughness: number
}

export const brands = {
  anthropic: { label: 'Claude · Anthropic', primary: '#c96442', secondary: '#efe9de', glow: '#ffb48a', ui: '#e08a66', roughness: 0.38 },
  openai: { label: 'GPT · OpenAI', primary: '#141414', secondary: '#f2f2f2', glow: '#e6fff7', ui: '#ededed', roughness: 0.22 },
  google: { label: 'Gemini · Google', primary: '#3b6fe0', secondary: '#9b72cb', glow: '#c9b2ff', ui: '#7fa6ff', roughness: 0.3 },
  meta: { label: 'Llama · Meta', primary: '#0866ff', secondary: '#dfe7f5', glow: '#8fc0ff', ui: '#5c9bff', roughness: 0.3 },
  mistral: { label: 'Mistral', primary: '#e8500f', secondary: '#ffd23f', glow: '#ffb000', ui: '#ff8a4c', roughness: 0.34 },
  deepseek: { label: 'DeepSeek', primary: '#4d6bfe', secondary: '#e6ebff', glow: '#9fb3ff', ui: '#8197ff', roughness: 0.3 },
  xai: { label: 'Grok · xAI', primary: '#1c1c1e', secondary: '#9a9aa0', glow: '#ff4040', ui: '#c9c9cf', roughness: 0.45 },
  qwen: { label: 'Qwen · Alibaba', primary: '#615ced', secondary: '#ebe9ff', glow: '#b9b5ff', ui: '#9d99ff', roughness: 0.3 },
} satisfies Record<string, Brand>

export type BrandKey = keyof typeof brands
