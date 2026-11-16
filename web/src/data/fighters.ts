import { brands, type BrandKey } from './brands'

export type WeightClass = 'Flyweight' | 'Middleweight' | 'Heavyweight'

export const classColor: Record<WeightClass, string> = {
  Flyweight: '#1a9b57',
  Middleweight: '#1a5fd0',
  Heavyweight: '#d00',
}

const CLASS_RANK: WeightClass[] = ['Flyweight', 'Middleweight', 'Heavyweight']

/** A model the server can run, as listed by GET /api/fights/models. */
export type CatalogModel = { id: string; label: string; maker: string; vendor: string; weightClass: 'flyweight' | 'middleweight' | 'heavyweight' }

/** The robot in one corner. Its look and ring name follow the model's vendor. */
export type MatchFighter = { name: string; brand: BrandKey; model: string; label: string; weightClass: WeightClass }

/** OpenRouter vendor prefix to robot brand. */
const VENDOR_BRAND: Record<string, BrandKey> = {
  anthropic: 'anthropic',
  openai: 'openai',
  google: 'google',
  meta: 'meta',
  'meta-llama': 'meta',
  mistralai: 'mistral',
  nvidia: 'nvidia',
  baidu: 'baidu',
  cohere: 'cohere',
  poolside: 'poolside',
  'dots-studio': 'dots',
  inclusionai: 'inclusionai',
  'particle-ai': 'particle',
  recursive: 'recursive',
}

const RING_NAME: Record<BrandKey, string> = {
  anthropic: 'Claude Pereira',
  openai: 'Georges St-GPT',
  google: 'Gemma Shevchenko',
  meta: 'Conor McLlama',
  mistral: "Sean O'Mistral",
  nvidia: 'Nate Nemotron',
  baidu: 'Ernie Edwards',
  cohere: 'Terence North',
  poolside: 'Francis Lagunnou',
  dots: 'Dotty Pimblett',
  inclusionai: 'Ling Weili',
  particle: 'Particle Pacquiao',
  recursive: 'Flint Mayweather',
  generic: 'The Contender',
}

const titleCase = (s: string) => s.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

function describe(modelId: string, catalog: CatalogModel[]) {
  const known = catalog.find((m) => m.id === modelId)
  if (known) return { vendor: known.vendor, label: known.label, weightClass: CLASS_RANK.find((c) => c.toLowerCase() === known.weightClass)! }
  const [vendor = '', slug = modelId] = modelId.includes('/') ? modelId.split('/') : ['', modelId]
  return { vendor, label: titleCase(slug.replace(/:.*$/, '')), weightClass: 'Middleweight' as WeightClass }
}

export function fighterFor(modelId: string, catalog: CatalogModel[]): MatchFighter {
  const d = describe(modelId, catalog)
  const brand = VENDOR_BRAND[d.vendor.toLowerCase()] ?? 'generic'
  const name = brand === 'generic' && d.label ? d.label : RING_NAME[brand]
  return { name, brand, model: modelId, label: d.label || modelId, weightClass: d.weightClass }
}

/** Both corners; a mirror match gets a "II" so the two are never confused. */
export function fightersFor(models: [string, string], catalog: CatalogModel[]): [MatchFighter, MatchFighter] {
  const red = fighterFor(models[0], catalog)
  const blue = fighterFor(models[1], catalog)
  return [red, blue.name === red.name ? { ...blue, name: `${blue.name} II` } : blue]
}

/** The heavier of the two fighters' classes. */
export const matchClass = (fighters: readonly MatchFighter[]) =>
  CLASS_RANK[Math.max(...fighters.map((f) => CLASS_RANK.indexOf(f.weightClass)))]!

export const brandOf = (f: MatchFighter) => brands[f.brand]

export function formatClock(sec: number) {
  const s = Math.max(0, sec)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export const firstName = (name: string) => name.split(' ')[0]

export const matchLabel = (n: number) => `M${String(n).padStart(3, '0')}`
