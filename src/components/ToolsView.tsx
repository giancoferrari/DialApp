import type { View } from '../types'
import { BagIcon, TargetIcon, ScorecardIcon, DumbbellIcon } from './Icons'

interface Props {
  onNavigate: (v: View) => void
  isMobile?: boolean
}

const TOOLS = [
  { view: 'bag'      as const, label: 'My Bag',   sub: 'Club distances',  Icon: BagIcon      },
  { view: 'dialin'   as const, label: 'Dial In',  sub: 'Shot calculator', Icon: TargetIcon   },
  { view: 'rounds'   as const, label: 'Rounds',   sub: 'Scorecards',      Icon: ScorecardIcon },
  { view: 'practice' as const, label: 'Practice', sub: 'Training log',    Icon: DumbbellIcon  },
]

export default function ToolsView({ onNavigate, isMobile = false }: Props) {
  const px = isMobile ? 20 : 40

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: `${isMobile ? 28 : 48}px ${px}px ${isMobile ? 120 : 80}px` }}>

      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: '#D9824D', textTransform: 'uppercase', marginBottom: 8 }}>
        Your kit
      </div>
      <h1 style={{
        fontFamily: "'Bricolage Grotesque', sans-serif",
        fontSize: isMobile ? 32 : 44, fontWeight: 700, color: '#1F1D17',
        letterSpacing: '-0.035em', margin: '0 0 32px', lineHeight: 1,
      }}>
        Tools
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr', gap: 12 }}>
        {TOOLS.map(item => (
          <button
            key={item.view}
            onClick={() => onNavigate(item.view)}
            style={{
              background: 'rgba(250,246,234,0.62)',
              backdropFilter: 'blur(24px) saturate(160%)',
              WebkitBackdropFilter: 'blur(24px) saturate(160%)',
              border: '1px solid rgba(255,255,255,0.52)',
              borderRadius: 20,
              padding: '24px 20px',
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14,
              cursor: 'pointer', textAlign: 'left',
              boxShadow: '0 4px 20px rgba(31,29,23,0.07), inset 0 1px 0 rgba(255,255,255,0.7)',
              transition: 'all 0.18s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(250,246,234,0.85)'
              e.currentTarget.style.boxShadow = '0 10px 28px rgba(31,58,42,0.14), inset 0 1px 0 rgba(255,255,255,0.8)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(250,246,234,0.62)'
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(31,29,23,0.07), inset 0 1px 0 rgba(255,255,255,0.7)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
            onMouseDown={e => {
              e.currentTarget.style.transform = 'scale(0.97)'
              e.currentTarget.style.boxShadow = '0 1px 6px rgba(31,29,23,0.05)'
            }}
            onMouseUp={e => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 10px 28px rgba(31,58,42,0.14), inset 0 1px 0 rgba(255,255,255,0.8)'
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              background: '#1F3A2A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <item.Icon size={22} color="#FAF6EA" />
            </div>
            <div>
              <div style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontSize: 18, fontWeight: 700, color: '#1F1D17',
                letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 4,
              }}>
                {item.label}
              </div>
              <div style={{ fontSize: 12, color: '#6B6857', fontWeight: 500 }}>
                {item.sub}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
