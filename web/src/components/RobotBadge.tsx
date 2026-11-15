import type { Brand } from '../data/brands'

/** Helmet portrait in the fighter's brand colours. */
export function RobotBadge({ brand, size = 72 }: { brand: Brand; size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
      <rect x="22" y="48" width="20" height="10" rx="2" fill="#2a2b2f" />
      <path d="M8 62 Q8 50 20 47 L44 47 Q56 50 56 62 Z" fill={brand.primary} stroke="#000" strokeOpacity="0.4" />
      <rect x="15" y="12" width="34" height="36" rx="10" fill={brand.primary} stroke="#000" strokeOpacity="0.4" />
      <rect x="29" y="6" width="6" height="14" rx="2" fill={brand.secondary} />
      <rect x="19" y="25" width="26" height="12" rx="3" fill="#0d0d0f" />
      <rect x="22" y="29" width="7" height="3" rx="1" fill={brand.glow} />
      <rect x="35" y="29" width="7" height="3" rx="1" fill={brand.glow} />
      <path d="M26 41 h12" stroke="#2a2b2f" strokeWidth="2" />
      <rect x="15" y="12" width="34" height="8" rx="4" fill="#fff" opacity="0.12" />
    </svg>
  )
}
