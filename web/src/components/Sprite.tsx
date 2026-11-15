import { FIGHTER, pixelColor, SPRITE_H, SPRITE_W, type SpriteColors } from '../game/sprites'

export function Sprite({ colors, scale = 3 }: { colors: SpriteColors; scale?: number }) {
  return (
    <svg
      viewBox={`0 0 ${SPRITE_W} ${SPRITE_H}`}
      width={SPRITE_W * scale}
      height={SPRITE_H * scale}
      shapeRendering="crispEdges"
      aria-hidden
    >
      {FIGHTER.flatMap((row, y) =>
        [...row].map((c, x) => {
          const fill = pixelColor(c, colors)
          return fill ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill} /> : null
        }),
      )}
    </svg>
  )
}
