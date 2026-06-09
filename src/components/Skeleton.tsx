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
        background: 'linear-gradient(100deg, rgba(23,26,23,0.05) 28%, rgba(23,26,23,0.10) 50%, rgba(23,26,23,0.05) 72%)',
        backgroundSize: '200% 100%',
        animation: 'skeletonShimmer 1.4s ease-in-out infinite',
        ...style,
      }}
    />
  )
}
