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

export function CameraIcon({ size = 22, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 3H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="4" stroke={color} strokeWidth="1.6" />
    </svg>
  )
}

export function UsersIcon({ size = 22, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="7" r="3.5" stroke={color} strokeWidth="1.6" />
      <path d="M2 20C2 17 5.13 14.5 9 14.5C12.87 14.5 16 17 16 20" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="17" cy="8" r="2.5" stroke={color} strokeWidth="1.5" />
      <path d="M19.5 15C21 15.8 22 17.3 22 19" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function TrophyIcon({ size = 22, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M8 21H16M12 17V21M7 3H17V11C17 13.76 14.76 16 12 16C9.24 16 7 13.76 7 11V3Z" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 5H4C4 5 3 10 7 11" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 5H20C20 5 21 10 17 11" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function CoinIcon({ size = 22, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.6" />
      <path d="M12 7V17M14.5 9.5C14.5 8.12 13.38 7 12 7C10.62 7 9.5 8.12 9.5 9.5C9.5 10.88 10.62 12 12 12C13.38 12 14.5 13.12 14.5 14.5C14.5 15.88 13.38 17 12 17C10.62 17 9.5 15.88 9.5 14.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function BellIcon({ size = 22, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function GearIcon({ size = 22, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function ChevronRightIcon({ size = 22, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M9 18L15 12L9 6" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function ToolsIcon({ size = 22, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.6" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.6" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.6" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.6" />
    </svg>
  )
}

export function ShieldIcon({ size = 22, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2L4 6V12C4 16.42 7.42 20.57 12 22C16.58 20.57 20 16.42 20 12V6L12 2Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

export function PencilIcon({ size = 22, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.43741 22.1213 4.00001C22.1213 4.56262 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ChatIcon({ size = 22, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function HeartIcon({ size = 22, color = 'currentColor', filled = false }: { size?: number; color?: string; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function GridIcon({ size = 22, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.6" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.6" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.6" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.6" />
    </svg>
  )
}

export function ChartIcon({ size = 22, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 21h18" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <rect x="5" y="11" width="3.6" height="7" rx="1.2" stroke={color} strokeWidth="1.6" />
      <rect x="10.2" y="6" width="3.6" height="12" rx="1.2" stroke={color} strokeWidth="1.6" />
      <rect x="15.4" y="13" width="3.6" height="5" rx="1.2" stroke={color} strokeWidth="1.6" />
    </svg>
  )
}

export function MedalIcon({ size = 22, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M8 4l3 6M16 4l-3 6" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="15.5" r="5" stroke={color} strokeWidth="1.6" />
    </svg>
  )
}

export function MoreIcon({ size = 22, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <circle cx="5" cy="12" r="1.9" />
      <circle cx="12" cy="12" r="1.9" />
      <circle cx="19" cy="12" r="1.9" />
    </svg>
  )
}

export function SendIcon({ size = 22, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ChevronLeftIcon({ size = 22, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M15 18l-6-6 6-6" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function RepostIcon({ size = 22, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M17 2l4 4-4 4" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 11V9a4 4 0 014-4h14" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 22l-4-4 4-4" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 13v2a4 4 0 01-4 4H3" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

