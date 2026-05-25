export default function OrganicGraphic({ size = 360 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
      {/* Layer 1: Outermost fairway */}
      <div style={{
        position: 'absolute', inset: 0,
        background: '#D1DBB5',
        borderRadius: '52% 48% 58% 42% / 46% 56% 44% 54%',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'repeating-linear-gradient(118deg, transparent 0, transparent 22px, rgba(31,58,42,0.06) 22px, rgba(31,58,42,0.06) 23px)',
        }} />
      </div>

      {/* Layer 2: Mid fairway */}
      <div style={{
        position: 'absolute', top: '5%', left: '7%', width: '86%', height: '86%',
        background: '#B5C29A',
        borderRadius: '58% 42% 62% 38% / 47% 56% 44% 53%',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'repeating-linear-gradient(118deg, transparent 0, transparent 18px, rgba(31,58,42,0.08) 18px, rgba(31,58,42,0.08) 19px)',
        }} />
      </div>

      {/* Layer 3: Approach green */}
      <div style={{
        position: 'absolute', top: '18%', left: '20%', width: '62%', height: '62%',
        background: '#7B9963',
        borderRadius: '56% 44% 60% 40% / 50% 50% 50% 50%',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'repeating-linear-gradient(118deg, transparent 0, transparent 14px, rgba(31,58,42,0.10) 14px, rgba(31,58,42,0.10) 15px)',
        }} />
      </div>

      {/* Layer 4: Putting green */}
      <div style={{
        position: 'absolute', top: '32%', left: '36%', width: '34%', height: '34%',
        background: '#5C7A4D',
        borderRadius: '60% 40% 55% 45% / 48% 52% 48% 52%',
      }} />

      {/* Sand bunkers */}
      <div style={{
        position: 'absolute', top: '12%', right: '13%', width: '21%', height: '14%',
        background: '#EFE2C2', borderRadius: '70% 30% 55% 45% / 60% 50% 50% 40%',
        transform: 'rotate(-18deg)',
        boxShadow: 'inset 0 -3px 6px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)',
      }} />
      <div style={{
        position: 'absolute', bottom: '16%', left: '12%', width: '17%', height: '12%',
        background: '#EFE2C2', borderRadius: '50% 60% 55% 45% / 60% 50% 50% 40%',
        transform: 'rotate(25deg)',
        boxShadow: 'inset 0 -3px 6px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)',
      }} />
      <div style={{
        position: 'absolute', top: '58%', right: '10%', width: '14%', height: '10%',
        background: '#EFE2C2', borderRadius: '60% 40% 50% 50% / 50% 50% 50% 50%',
        transform: 'rotate(-8deg)',
        boxShadow: 'inset 0 -3px 6px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)',
      }} />

      {/* Flag stick + flag */}
      <svg width="56" height="72" style={{ position: 'absolute', top: '26%', left: '52%', zIndex: 5 }}>
        <line x1="6" y1="68" x2="6" y2="4" stroke="#1F1D17" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M 6 4 L 30 9 L 6 14 Z" fill="#D9824D" />
        <path d="M 6 4 L 30 9 L 6 9 Z" fill="#E8A777" />
        <circle cx="6" cy="68" r="3.2" fill="#1F1D17" opacity="0.4" />
      </svg>

      {/* Paper-grain overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(rgba(31,29,23,0.06) 0.5px, transparent 0.5px)',
        backgroundSize: '4px 4px',
        borderRadius: '52% 48% 58% 42% / 46% 56% 44% 54%',
        mixBlendMode: 'multiply',
        pointerEvents: 'none',
        zIndex: 10,
      }} />
    </div>
  )
}
