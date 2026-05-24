export function ArrowRight({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ArrowUpRight({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M7 17L17 7M17 7H8M17 7V16" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function PlusIcon({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 5V19M5 12H19" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

export function CheckIcon({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 12L10 17L19 7" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function CloseIcon({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M6 6L18 18M18 6L6 18" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

// ── Nav icons for bottom tab bar ──────────────────────────

export function HomeIcon({ size = 22, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 9.5L12 3L21 9.5V20C21 20.55 20.55 21 20 21H15V16H9V21H4C3.45 21 3 20.55 3 20V9.5Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

export function BagIcon({ size = 22, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="4" y="8" width="16" height="13" rx="2" stroke={color} strokeWidth="1.6" />
      <path d="M9 8V6C9 4.34 10.34 3 12 3C13.66 3 15 4.34 15 6V8" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M4 13H20" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export function TargetIcon({ size = 22, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.6" />
      <circle cx="12" cy="12" r="5" stroke={color} strokeWidth="1.6" />
      <circle cx="12" cy="12" r="1.5" fill={color} />
    </svg>
  )
}

export function ScorecardIcon({ size = 22, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="4" y="3" width="16" height="18" rx="2" stroke={color} strokeWidth="1.6" />
      <path d="M8 8H16M8 12H16M8 16H12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function DumbbellIcon({ size = 22, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="5" cy="12" r="2.5" stroke={color} strokeWidth="1.6" />
      <circle cx="19" cy="12" r="2.5" stroke={color} strokeWidth="1.6" />
      <path d="M7.5 12H16.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function PersonIcon({ size = 22, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke={color} strokeWidth="1.6" />
      <path d="M4 20C4 17 7.58 14 12 14C16.42 14 20 17 20 20" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
