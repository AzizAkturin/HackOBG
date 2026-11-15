// Robot paint schemes and body keyed by the fighter's model provider.
// Colours only: no logos or wordmarks are drawn.
import type { ChassisKey } from '../three/robots/chassis'

export interface Brand {
  label: string
  /** main armour */
  primary: string
  /** trim, fists, chest plate */
  secondary: string
  /** joints and undersuit, the third team colour */
  gear: string
  /** visor eyes and waist core */
  glow: string
  /** readable text colour on the dark UI */
  ui: string
  /** readable text colour on light surfaces */
  ink: string
  /** armour finish: 0 = glossy, 1 = matte */
  roughness: number
  /** the provider's robot body */
  chassis: ChassisKey
}

export const brands = {
  nvidia: { label: 'Nemotron · NVIDIA', primary: '#76b900', secondary: '#111214', gear: '#2a3a10', glow: '#c6ff4d', ui: '#8fd43a', ink: '#4c7a00', roughness: 0.3, chassis: 'halo' },
  meta: { label: 'Llama · Meta', primary: '#1f8bff', secondary: '#f4f7ff', gear: '#0b3a8f', glow: '#bfe0ff', ui: '#5cb0ff', ink: '#0866ff', roughness: 0.3, chassis: 'bulwark' },
  google: { label: 'Gemma · Google', primary: '#3fcf78', secondary: '#4a90ff', gear: '#1a4fa0', glow: '#a8c7fa', ui: '#5fd08a', ink: '#1e8e4e', roughness: 0.3, chassis: 'gyro' },
  mistral: { label: 'Mistral', primary: '#fa520f', secondary: '#16120f', gear: '#4a1a06', glow: '#ffd800', ui: '#ff8a4c', ink: '#d9480f', roughness: 0.36, chassis: 'voxel' },
  baidu: { label: 'ERNIE · Baidu', primary: '#2932e1', secondary: '#e8212b', gear: '#10144f', glow: '#ffffff', ui: '#7b82ff', ink: '#2932e1', roughness: 0.36, chassis: 'crash' },
  cohere: { label: 'North · Cohere', primary: '#9b5de5', secondary: '#ff7759', gear: '#1f4d3a', glow: '#ffc2b0', ui: '#c79bff', ink: '#7a3fc4', roughness: 0.34, chassis: 'stilt' },
  poolside: { label: 'Laguna · Poolside', primary: '#1fd6c8', secondary: '#ff4fa3', gear: '#0a5a66', glow: '#e8fff9', ui: '#5ff0e0', ink: '#0f8f86', roughness: 0.2, chassis: 'pebble' },
  dots: { label: 'dots · dots.studio', primary: '#1a1a1d', secondary: '#f2efe6', gear: '#6a6a72', glow: '#ff3b30', ui: '#ededed', ink: '#1a1a1a', roughness: 0.24, chassis: 'orbit' },
  inclusionai: { label: 'Ling · InclusionAI', primary: '#9a1f33', secondary: '#e9dcc0', gear: '#3d0f18', glow: '#ff9f3c', ui: '#e8586f', ink: '#9a1f33', roughness: 0.5, chassis: 'junker' },
  particle: { label: 'Particle · Particle AI', primary: '#e0a326', secondary: '#1d1712', gear: '#5a4210', glow: '#fff0a8', ui: '#f2c04a', ink: '#8a6420', roughness: 0.3, chassis: 'kettle' },
  recursive: { label: 'Flint · Recursive', primary: '#aeb8c8', secondary: '#1c2230', gear: '#5a6578', glow: '#00e5ff', ui: '#8fdcff', ink: '#3a4a66', roughness: 0.26, chassis: 'lantern' },
  anthropic: { label: 'Claude · Anthropic', primary: '#cc785c', secondary: '#f0eee6', gear: '#3f2418', glow: '#ffd9c2', ui: '#e6937a', ink: '#b5573a', roughness: 0.42, chassis: 'silverback' },
  openai: { label: 'GPT · OpenAI', primary: '#f3f3ef', secondary: '#10a37f', gear: '#2a2d31', glow: '#3df5b8', ui: '#19c37d', ink: '#0b7a5f', roughness: 0.26, chassis: 'sable' },
} satisfies Record<string, Brand>

export type BrandKey = keyof typeof brands
