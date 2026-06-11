import type { View } from '../types'
import { BagIcon, TargetIcon, ScorecardIcon, DumbbellIcon, ChartIcon, ChevronRightIcon } from './Icons'
import { color, font, radius } from '../lib/tokens'
import { card } from '../lib/surfaces'

interface Props {
  onNavigate: (v: View) => void
  isMobile?: boolean
}

const TOOLS = [
  { view: 'stats'    as const, label: 'Stats',    sub: 'Trends, handicap & averages', Icon: ChartIcon,     feature: true },
  { view: 'rounds'   as const, label: 'Rounds',   sub: 'Scorecards',      Icon: ScorecardIcon },
  { view: 'bag'      as const, label: 'My Bag',   sub: 'Club distances',  Icon: BagIcon      },
  { view: 'dialin'   as const, label: 'Dial In',  sub: 'Shot calculator', Icon: TargetIcon   },
  { view: 'practice' as const, label: 'Practice', sub: 'Training log',    Icon: DumbbellIcon  },
]

export default function ToolsView({ onNavigate, isMobile = false }: Props) {
  const px = isMobile ? 20 : 40

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: `${isMobile ? 28 : 44}px ${px}px ${isMobile ? 120 : 80}px` }}>

      <h1 style={{ fontFamily: font.display, fontSize: isMobile ? 30 : 36, fontWeight: 600, color: color.ink, letterSpacing: '-0.02em', margin: '0 0 4px', lineHeight: 1 }}>
        Tools
      </h1>
      <p style={{ fontSize: 14, color: color.muted, margin: '0 0 26px' }}>Everything to sharpen your game.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {TOOLS.map(item => (
          <button
            key={item.view}
            onClick={() => onNavigate(item.view)}
            style={{
              ...card,
              gridColumn: item.feature ? '1 / -1' : undefined,
              padding: item.feature ? '20px 20px' : '20px 18px',
              display: 'flex',
              flexDirection: item.feature ? 'row' : 'column',
              alignItems: item.feature ? 'center' : 'flex-start',
              gap: item.feature ? 16 : 14,
              cursor: 'pointer', textAlign: 'left',
              transition: 'background 0.18s, transform 0.16s cubic-bezier(0.22,1,0.36,1)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = color.sand }}
            onMouseLeave={e => { e.currentTarget.style.background = color.white }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
            onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.98)' }}
            onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: radius.sm,
              background: color.greenTint,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <item.Icon size={22} color={color.green} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: font.display, fontSize: 17, fontWeight: 600, color: color.ink, letterSpacing: '-0.01em', lineHeight: 1.1, marginBottom: 3 }}>
                {item.label}
              </div>
              <div style={{ fontSize: 13, color: color.muted, fontWeight: 500 }}>
                {item.sub}
              </div>
            </div>
            {item.feature && <ChevronRightIcon size={18} color={color.faint} />}
          </button>
        ))}
      </div>
    </div>
  )
}
