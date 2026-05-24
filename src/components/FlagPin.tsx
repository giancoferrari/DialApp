export default function FlagPin({ size = 14, color = '#D9824D' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
      <line x1="3" y1="13" x2="3" y2="1" stroke="#1F1D17" strokeWidth="1" strokeLinecap="round" />
      <path d="M 3 1 L 11 3 L 3 5 Z" fill={color} />
      <circle cx="3" cy="13" r="1.2" fill="#1F1D17" opacity="0.5" />
    </svg>
  )
}
