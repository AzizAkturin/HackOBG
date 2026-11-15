// 12px-wide pixel fighter, gloves up. Legend:
// k outline · e eyes · h hair · s skin · g gloves · t trunks · w waistband
export const FIGHTER = [
  '....kkkk....',
  '...khhhhk...',
  '...kessek...',
  '...kssssk...',
  '....kssk....',
  '.kk.kssk.kk.',
  'kggkkssskggk',
  'kgggsssssggk',
  '.kgksssskgk.',
  '..kksssskk..',
  '...kssssk...',
  '..kttttttk..',
  '..kwwwwwwk..',
  '..kttkkttk..',
  '..ksk..ksk..',
  '..ksk..ksk..',
  '..ksk..ksk..',
  '.kkk...kkk..',
]

export const SPRITE_W = 12
export const SPRITE_H = FIGHTER.length

export interface SpriteColors {
  skin: string
  hair: string
  accent: string
}

export function pixelColor(c: string, col: SpriteColors): string | null {
  switch (c) {
    case 'k':
    case 'e':
      return '#07060d'
    case 'w':
      return '#f2f0fa'
    case 's':
      return col.skin
    case 'h':
      return col.hair
    case 'g':
    case 't':
      return col.accent
    default:
      return null
  }
}

export function drawSprite(ctx: CanvasRenderingContext2D, col: SpriteColors, ox: number, oy: number) {
  FIGHTER.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const fill = pixelColor(row[x], col)
      if (!fill) continue
      ctx.fillStyle = fill
      ctx.fillRect(ox + x, oy + y, 1, 1)
    }
  })
}
