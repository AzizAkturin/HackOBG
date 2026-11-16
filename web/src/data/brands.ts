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
  nvidia: { label: 'Nemotron · NVIDIA', primary: '#76b900', secondary: '#40521f', gear: '#324314', glow: '#c6ff4d', ui: '#8fd43a', ink: '#4c7a00', roughness: 0.3, chassis: 'halo' },
  meta: { label: 'Llama · Meta', primary: '#1a7bff', secondary: '#3a6298', gear: '#142843', glow: '#bfe0ff', ui: '#5cb0ff', ink: '#0866ff', roughness: 0.3, chassis: 'bulwark' },
  google: { label: 'Gemma · Google', primary: '#34a853', secondary: '#86b595', gear: '#1f3825', glow: '#4a90ff', ui: '#5fd08a', ink: '#1e8e4e', roughness: 0.3, chassis: 'gyro' },
  mistral: { label: 'Mistral', primary: '#fa520f', secondary: '#8b4f37', gear: '#422214', glow: '#ffd800', ui: '#ff8a4c', ink: '#d9480f', roughness: 0.36, chassis: 'voxel' },
  baidu: { label: 'ERNIE · Baidu', primary: '#2932e1', secondary: '#7e84c6', gear: '#191b3d', glow: '#ff5a5f', ui: '#7b82ff', ink: '#2932e1', roughness: 0.36, chassis: 'crash' },
  cohere: { label: 'North · Cohere', primary: '#9b5de5', secondary: '#7a55a6', gear: '#2a1a3d', glow: '#ff7759', ui: '#c79bff', ink: '#7a3fc4', roughness: 0.34, chassis: 'stilt' },
  poolside: { label: 'Laguna · Poolside', primary: '#1fd6c8', secondary: '#3a7470', gear: '#1a3d3a', glow: '#e8fff9', ui: '#5ff0e0', ink: '#0f8f86', roughness: 0.2, chassis: 'pebble' },
  dots: { label: 'dots · dots.studio', primary: '#1a1a1d', secondary: '#a4a4ae', gear: '#3a3a40', glow: '#ff3b30', ui: '#ededed', ink: '#1a1a1a', roughness: 0.24, chassis: 'orbit' },
  inclusionai: { label: 'Ling · InclusionAI', primary: '#9a1f33', secondary: '#b97c88', gear: '#3b1b21', glow: '#ff9f3c', ui: '#e8586f', ink: '#9a1f33', roughness: 0.5, chassis: 'junker' },
  particle: { label: 'Particle · Particle AI', primary: '#e0a326', secondary: '#7f6a3f', gear: '#3d3219', glow: '#fff0a8', ui: '#f2c04a', ink: '#8a6420', roughness: 0.3, chassis: 'kettle' },
  recursive: { label: 'Flint · Recursive', primary: '#aeb8c8', secondary: '#606772', gear: '#272a30', glow: '#00e5ff', ui: '#8fdcff', ink: '#3a4a66', roughness: 0.26, chassis: 'lantern' },
  anthropic: { label: 'Claude · Anthropic', primary: '#d77a5c', secondary: '#966556', gear: '#3a241d', glow: '#ffd9c2', ui: '#e6937a', ink: '#b5573a', roughness: 0.42, chassis: 'silverback' },
  openai: { label: 'GPT · OpenAI', primary: '#f3f3ef', secondary: '#9fb8b0', gear: '#2c3a37', glow: '#3df5b8', ui: '#19c37d', ink: '#0b7a5f', roughness: 0.26, chassis: 'sable' },
  generic: { label: 'Open model', primary: '#5c6470', secondary: '#9aa3ad', gear: '#23272d', glow: '#ffffff', ui: '#c9d1da', ink: '#3b4450', roughness: 0.35, chassis: 'lantern' },
} satisfies Record<string, Brand>

export type BrandKey = keyof typeof brands
