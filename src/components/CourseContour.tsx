import { color } from '../lib/tokens'

// ── Topographic course linework — Dial's brand landscape ───────────────────
// Faint fairway contours + a ringed green with a pin. Used as a texture layer
// behind dark-green heroes (and, dimmed, on a few light surfaces). Purely
// decorative; absolutely positioned to fill its container.
export default function CourseContour({
  stroke = color.onGreen,
  opacity = 1,
  showPin = true,
}: { stroke?: string; opacity?: number; showPin?: boolean }) {
  return (
    <svg
      viewBox="0 0 420 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity }}
    >
      <g fill="none" stroke={stroke} strokeWidth="1">
        {/* rolling fairway contours */}
        <path opacity="0.07" d="M-20,236 C60,196 128,224 196,186 C262,150 330,128 448,150" />
        <path opacity="0.05" d="M-20,272 C76,228 152,260 224,216 C292,176 356,158 448,182" />
        <path opacity="0.06" d="M-24,196 C52,158 124,180 188,142 C254,104 330,84 448,108" />
        <path opacity="0.04" d="M-24,310 C88,266 176,296 248,250 C316,208 380,192 452,214" />
        {/* the green, ringed */}
        <ellipse opacity="0.07" cx="332" cy="64" rx="86" ry="32" />
        <ellipse opacity="0.05" cx="332" cy="64" rx="52" ry="19" />
        {showPin && (
          <>
            <line opacity="0.22" x1="332" y1="64" x2="332" y2="30" strokeWidth="1.4" />
            <path opacity="0.22" d="M332,30 L354,36 L332,43 Z" fill={stroke} stroke="none" />
            <circle opacity="0.3" cx="332" cy="64" r="2" fill={stroke} stroke="none" />
          </>
        )}
      </g>
    </svg>
  )
}
