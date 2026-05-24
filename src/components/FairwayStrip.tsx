export default function FairwayStrip({ height = 140 }: { height?: number }) {
  return (
    <div style={{
      width: '100%', height,
      position: 'relative', borderRadius: 24, overflow: 'hidden',
      background: '#B5C29A', border: '1px solid #E0D8C5',
    }}>
      {/* Mowed stripes */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'repeating-linear-gradient(95deg, transparent 0, transparent 28px, rgba(31,58,42,0.10) 28px, rgba(31,58,42,0.10) 30px)',
      }} />

      {/* Darker fairway shape right */}
      <div style={{
        position: 'absolute', top: '-10%', right: '6%', width: '38%', height: '120%',
        background: '#7B9963',
        borderRadius: '60% 50% 50% 40% / 50% 60% 40% 50%',
      }} />

      {/* Putting green */}
      <div style={{
        position: 'absolute', top: '20%', right: '14%', width: '14%', height: '60%',
        background: '#5C7A4D',
        borderRadius: '52% 48% 56% 44% / 50% 50% 50% 50%',
      }} />

      {/* Large kidney bunker */}
      <div style={{
        position: 'absolute', top: '25%', left: '14%', width: '18%', height: '52%',
        background: '#EFE2C2',
        borderRadius: '70% 30% 55% 45% / 60% 50% 50% 40%',
        transform: 'rotate(-10deg)',
        boxShadow: 'inset 0 -3px 6px rgba(0,0,0,0.08)',
      }} />

      {/* Small bunker */}
      <div style={{
        position: 'absolute', bottom: '12%', left: '46%', width: '7%', height: '32%',
        background: '#EFE2C2', borderRadius: '55% 45% 50% 50%',
      }} />

      {/* Flag */}
      <svg width="34" height="50" style={{ position: 'absolute', top: '24%', right: '22%', zIndex: 4 }}>
        <line x1="6" y1="48" x2="6" y2="4" stroke="#1F1D17" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M 6 4 L 24 8 L 6 13 Z" fill="#D9824D" />
        <path d="M 6 4 L 24 8 L 6 8 Z" fill="#E8A777" />
        <circle cx="6" cy="48" r="2.5" fill="#1F1D17" opacity="0.45" />
      </svg>

      {/* Golf ball */}
      <div style={{
        position: 'absolute', top: '46%', left: '38%',
        width: 7, height: 7, borderRadius: '50%',
        background: '#FAF6EA', border: '0.5px solid rgba(31,29,23,0.4)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
      }} />

      {/* Grain overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(rgba(31,29,23,0.05) 0.5px, transparent 0.5px)',
        backgroundSize: '4px 4px',
        mixBlendMode: 'multiply',
        pointerEvents: 'none',
      }} />
    </div>
  )
}
