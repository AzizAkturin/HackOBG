import type { ReactNode } from 'react'
import type { Brand } from '../data/brands'
import type { ChassisKey } from '../three/robots/chassis'
import type { Firmware } from '../three/robots/firmware'

const LINE = { stroke: '#000', strokeOpacity: 0.4 }
const DARK = '#0d0d0f'
const MECH = '#2a2b2f'

type Head = (b: Brand) => ReactNode

const heads: Record<ChassisKey, Head> = {
  bulwark: (b) => (
    <>
      <circle cx="32" cy="26" r="15" fill={b.primary} {...LINE} />
      <rect x="20" y="22" width="24" height="9" rx="4" fill={DARK} />
      <rect x="23" y="25.5" width="18" height="2.5" rx="1" fill={b.glow} />
      <rect x="17" y="17" width="30" height="4" rx="2" fill={b.secondary} />
      <rect x="29" y="9" width="6" height="3" rx="1" fill={b.secondary} />
    </>
  ),
  sable: (b) => (
    <>
      <rect x="20" y="8" width="24" height="36" rx="11" fill={b.primary} {...LINE} />
      <rect x="25" y="25" width="14" height="1.6" rx="0.8" fill={b.glow} opacity="0.7" />
      <rect x="43" y="20" width="4" height="12" rx="1.5" fill={b.secondary} />
    </>
  ),
  halo: (b) => (
    <>
      <ellipse cx="32" cy="28" rx="12" ry="16" fill={b.secondary} {...LINE} />
      <path d="M18 22 Q32 6 46 22" fill={b.primary} {...LINE} />
      <ellipse cx="32" cy="21" rx="15" ry="4" fill="none" stroke={b.primary} strokeWidth="3" />
      <rect x="23" y="21" width="18" height="2.5" rx="1.2" fill={b.glow} />
    </>
  ),
  stilt: (b) => (
    <>
      <rect x="29" y="34" width="6" height="12" fill={MECH} />
      <rect x="20" y="16" width="24" height="18" rx="2" fill={b.primary} {...LINE} />
      <rect x="23" y="22" width="18" height="5" rx="1" fill={DARK} />
      <rect x="25" y="23.8" width="14" height="1.6" fill={b.glow} />
      <rect x="25" y="11" width="14" height="5" rx="1" fill={b.secondary} />
    </>
  ),
  crash: (b) => (
    <>
      <rect x="18" y="14" width="28" height="24" rx="3" fill={b.primary} {...LINE} />
      <rect x="20" y="20" width="24" height="13" rx="2" fill={DARK} />
      <rect x="23" y="25" width="18" height="3" rx="1" fill={b.glow} />
      <rect x="16" y="16" width="32" height="4" rx="1" fill={MECH} />
      <line x1="24" y1="14" x2="21" y2="3" stroke="#c9ccd2" strokeWidth="1.2" />
      <circle cx="21" cy="3" r="1.6" fill={b.glow} />
    </>
  ),
  gyro: (b) => (
    <>
      <rect x="24" y="8" width="16" height="38" rx="3" fill={b.primary} {...LINE} />
      <circle cx="32" cy="13" r="2.5" fill={b.glow} />
      {[0, 1, 2].map((r) => [27.5, 36.5].map((x) => <circle key={`${r}${x}`} cx={x} cy={20 + r * 7} r="2.4" fill={DARK} />))}
      <rect x="23" y="6" width="18" height="3" rx="1" fill={MECH} />
    </>
  ),
  junker: (b) => (
    <>
      <circle cx="28" cy="30" r="13" fill={MECH} {...LINE} />
      <circle cx="34" cy="26" r="11" fill={b.secondary} {...LINE} />
      <circle cx="36" cy="25" r="5" fill={MECH} />
      <circle cx="36" cy="25" r="3" fill={b.glow} />
      <path d="M30 34 Q22 44 14 40" fill="none" stroke={b.secondary} strokeWidth="3" />
      <rect x="44" y="12" width="14" height="14" rx="1" fill={b.primary} {...LINE} />
    </>
  ),
  silverback: (b) => (
    <>
      <ellipse cx="12" cy="30" rx="10" ry="12" fill={b.primary} {...LINE} />
      <ellipse cx="52" cy="30" rx="10" ry="12" fill={b.primary} {...LINE} />
      <ellipse cx="32" cy="34" rx="10" ry="9" fill={b.primary} {...LINE} />
      <circle cx="32" cy="34" r="4" fill={DARK} />
      <circle cx="32" cy="34" r="2.4" fill={b.glow} />
      <rect x="24" y="25" width="16" height="3" rx="1.5" fill={b.primary} {...LINE} />
    </>
  ),
  pebble: (b) => (
    <>
      <rect x="20" y="34" width="24" height="12" rx="4" fill={b.primary} {...LINE} />
      <ellipse cx="32" cy="24" rx="15" ry="12" fill={b.secondary} {...LINE} />
      <path d="M36 21 l5 0 l-2.5 4 z" fill={b.glow} />
    </>
  ),
  kettle: (b) => (
    <>
      <ellipse cx="32" cy="28" rx="15" ry="14" fill={b.primary} {...LINE} />
      <circle cx="32" cy="28" r="8" fill={b.secondary} />
      <circle cx="32" cy="28" r="6" fill={b.glow} />
      {[0, 1, 2, 3, 4, 5].map((n) => (
        <circle key={n} cx={32 + Math.cos((n * Math.PI) / 3) * 7} cy={28 + Math.sin((n * Math.PI) / 3) * 7} r="0.9" fill="#8d9096" />
      ))}
    </>
  ),
  voxel: (b) => (
    <>
      <rect x="16" y="14" width="32" height="28" fill={b.primary} {...LINE} />
      <rect x="16" y="8" width="8" height="8" fill={b.primary} {...LINE} />
      <rect x="40" y="8" width="8" height="8" fill={b.primary} {...LINE} />
      <rect x="19" y="22" width="26" height="8" fill={DARK} />
      {[22.5, 30, 37.5].map((x) => (
        <rect key={x} x={x} y="24.5" width="4" height="3" fill={b.glow} />
      ))}
    </>
  ),
  orbit: (b) => (
    <>
      <circle cx="32" cy="26" r="16" fill={b.primary} {...LINE} />
      <ellipse cx="32" cy="29" rx="12" ry="7" fill={DARK} />
      {[25, 32, 39].map((x) => (
        <circle key={x} cx={x} cy="29" r="2.2" fill={b.glow} />
      ))}
    </>
  ),
  lantern: (b) => (
    <>
      <rect x="20" y="38" width="24" height="7" rx="2" fill={b.primary} {...LINE} />
      <rect x="20" y="8" width="24" height="5" rx="2" fill={b.primary} {...LINE} />
      <circle cx="32" cy="25" r="7" fill={b.glow} />
      {[22, 27, 32, 37, 42].map((x) => (
        <rect key={x} x={x - 0.8} y="13" width="1.6" height="25" fill={b.primary} />
      ))}
      <ellipse cx="32" cy="25" rx="10" ry="3" fill="none" stroke={b.secondary} strokeWidth="1.2" />
    </>
  ),
}

/** Head portrait of the provider's robot; lit pips show the firmware tier. */
export function RobotBadge({ brand, firmware, size = 72 }: { brand: Brand; firmware?: Firmware; size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
      <path d="M8 62 Q8 50 20 47 L44 47 Q56 50 56 62 Z" fill={brand.primary} {...LINE} />
      {heads[brand.chassis](brand)}
      {firmware &&
        [0, 1, 2].map((n) => (
          <rect key={n} x={24 + n * 6} y="54" width="4" height="4" rx="1" fill={n < firmware.pips ? firmware.color : DARK} stroke="#000" strokeOpacity="0.5" />
        ))}
    </svg>
  )
}
