export const TIERS = 9
export const FIRST_ROW = 8.2
export const ROW_DEPTH = 1.05
export const ROW_RISE = 0.55
export const STAGE_Y = 0.45
export const DESK_XS = [-2.6, 0, 2.6]
export const DESK_Z = 5.0
/** Height of a commentator's chair seat above the stage. */
export const CHAIR_H = 0.45
/** Commentator spots on the camera side of each desk, facing the ring: x, z. */
export const COMMENTATORS: [number, number][] = DESK_XS.map((x) => [x, DESK_Z + 0.7])
