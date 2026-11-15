// Body types for the fighters. Paint comes from the model's brand; the build
// decides silhouette: proportions, head, shoulders, chest and fists.

export type HeadKind = 'dome' | 'wedge' | 'cage' | 'mono'
export type ShoulderKind = 'round' | 'blade' | 'spiked' | 'frame'
export type ChestKind = 'barrel' | 'tapered' | 'frame'

export interface RobotBuild {
  label: string
  /** overall height multiplier */
  height: number
  /** width multiplier for torso and shoulder spread */
  bulk: number
  /** fist size multiplier */
  fist: number
  head: HeadKind
  shoulders: ShoulderKind
  chest: ChestKind
  exhaust: boolean
  fins: boolean
}

export const builds = {
  /** Squat, barrel-chested power puncher with a grilled dome and huge fists. */
  brawler: { label: 'Brawler', height: 0.95, bulk: 1.15, fist: 1.18, head: 'dome', shoulders: 'round', chest: 'barrel', exhaust: true, fins: false },
  /** Tall and lean, angular head, blade shoulders, quick lighter hands. */
  striker: { label: 'Striker', height: 1.07, bulk: 0.86, fist: 0.88, head: 'wedge', shoulders: 'blade', chest: 'tapered', exhaust: false, fins: true },
  /** Massive frame, caged head, spiked pauldrons. */
  tank: { label: 'Tank', height: 1.02, bulk: 1.28, fist: 1.25, head: 'cage', shoulders: 'spiked', chest: 'barrel', exhaust: true, fins: false },
  /** Stripped-down frame, exposed pistons, one big eye. */
  scrapper: { label: 'Scrapper', height: 0.98, bulk: 0.95, fist: 1.0, head: 'mono', shoulders: 'frame', chest: 'frame', exhaust: false, fins: false },
} satisfies Record<string, RobotBuild>

export type BuildKey = keyof typeof builds
