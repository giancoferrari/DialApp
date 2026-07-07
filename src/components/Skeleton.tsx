interface Props {
  width?: number | string
  height?: number | string
  radius?: number | string
  style?: React.CSSProperties
}

// A shimmering placeholder block. Compose these into content-shaped skeletons.
export default function Skeleton({ width = '100%', height = 14, radius = 10, style }: Props) {
  return (
    <div
      style={{
        width, height, borderRadius: radius,
        background: 'var(--skeleton-shimmer)',
        backgroundSize: '200% 100%',
        animation: 'skeletonShimmer 1.4s ease-in-out infinite',
        ...style,
      }}
    />
  )
}
