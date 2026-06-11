// ── Coastal golf-course hero illustration ──────────────────────────────────
// Ported from the dial-home prototype's .course-art SVG (the brand's Home
// hero): warm sky, ocean band, terracotta headlands, pine treeline, fairway,
// bunker and a red flag. Rendered full-bleed; `slice` keeps the composition
// anchored to the bottom edge so it crops gracefully at any width.
export default function CourseHeroArt({ height = 265 }: { height?: number }) {
  return (
    <svg
      viewBox="0 0 390 275"
      preserveAspectRatio="xMidYMax slice"
      role="img"
      aria-label="Illustrated coastal golf hole with ocean, headlands, trees and a red flag"
      style={{ display: 'block', width: '100%', height }}
    >
      <defs>
        <linearGradient id="heroSky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fbf7eb" />
          <stop offset=".58" stopColor="#f7f3e8" />
          <stop offset="1" stopColor="#dde7df" />
        </linearGradient>
        <linearGradient id="heroWater" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#b7dce2" />
          <stop offset=".58" stopColor="#92c9d4" />
          <stop offset="1" stopColor="#6fb3c2" />
        </linearGradient>
        <linearGradient id="heroFairway" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#244f25" />
          <stop offset=".42" stopColor="#66843a" />
          <stop offset="1" stopColor="#d9d294" />
        </linearGradient>
        <linearGradient id="heroGreen" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#9eae64" />
          <stop offset=".6" stopColor="#d6cd86" />
          <stop offset="1" stopColor="#ebe1a0" />
        </linearGradient>
        <radialGradient id="heroTree" cx=".45" cy=".3" r=".75">
          <stop offset="0" stopColor="#7b8d39" />
          <stop offset=".54" stopColor="#496b2c" />
          <stop offset="1" stopColor="#113b26" />
        </radialGradient>
      </defs>

      {/* Sky + clouds */}
      <rect width="390" height="275" fill="url(#heroSky)" />
      <path d="M230 48c7-9 21-10 28-2 10-5 24-1 30 8h-83c6-5 15-6 25-6Z" fill="#fffaf0" opacity=".85" />
      <path d="M208 95c12-22 39-27 56-12 20-12 49-4 58 18H178c10-7 19-8 30-6Z" fill="#fffaf0" opacity=".68" />

      {/* Distant shore + sea */}
      <path d="M0 113c53-6 88-3 129 7 47 11 91 6 130 0 47-8 88-7 131 2v48H0Z" fill="#dbe8df" />
      <path d="M0 139h390v62H0Z" fill="url(#heroWater)" />
      <path d="M6 178c38 0 72-3 102-13 41-13 72-17 119-8 44 8 85 4 163-10v54H0Z" fill="#e6eee8" opacity=".24" />
      <path d="M0 166c33-5 71-7 107-4 43 3 90 11 138 7 56-5 99-16 145-22" stroke="#f5f5ed" strokeWidth="1.2" opacity=".75" fill="none" />

      {/* Terracotta headlands */}
      <path d="M34 148l24-23 14 3 18 27c-23 4-41 2-56-7Z" fill="#c86421" />
      <path d="M51 126l10-17 17 8 16 32c-17 3-32-4-43-23Z" fill="#df8136" />
      <path d="M48 128l22-16 10 36-30 3Z" fill="#a84c22" opacity=".58" />
      <path d="M306 152l35-19 22 4 27 31c-37-2-61-6-84-16Z" fill="#d58a44" />
      <path d="M336 135l22-15 32 33v17l-45-8Z" fill="#e6a261" />

      {/* Fairway bands */}
      <path d="M0 186c51-13 104-23 161-22 64 1 100 12 151 10 29-1 54-5 78-12v113H0Z" fill="#2d5d2c" />
      <path d="M0 205c50-6 88-1 119 14 55 26 116 17 162 2 41-13 78-13 109 2v52H0Z" fill="url(#heroFairway)" />
      <path d="M14 258c38-36 88-53 150-52 95 3 160 27 226 11v58H0Z" fill="#d6d094" opacity=".78" />

      {/* Putting green + bunker */}
      <path d="M176 197c63-8 133 4 162 31-18 29-71 42-131 32-62-10-90-34-31-63Z" fill="url(#heroGreen)" />
      <path d="M19 223c30-12 73-13 111-5-8 16-35 26-68 23-27-2-43-8-43-18Z" fill="#173c22" opacity=".9" />
      <path d="M27 221c28-7 70-9 96-2-8 11-29 17-57 16-26-1-40-6-39-14Z" fill="#fffaf1" />

      {/* Flag */}
      <path d="M212 193v-53" stroke="#fbf5e7" strokeWidth="1.4" />
      <path d="M214 140l20 7-20 8Z" fill="#df2e1f" />
      <path d="M212 193c11 0 22 2 32 5" stroke="#2c4d27" strokeWidth="1" opacity=".45" fill="none" />

      {/* Right pines */}
      <g>
        <path d="M335 275c-3-44 2-82 16-115" stroke="#153a2a" strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M363 275c-7-51-5-96 4-133" stroke="#173928" strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M383 275c-12-44-14-88-6-128" stroke="#183b28" strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M351 172c-16 17-28 38-37 65" stroke="#143625" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M363 161c-9 19-13 41-14 68" stroke="#143625" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M376 155c-1 22 3 45 10 70" stroke="#143625" strokeWidth="3" strokeLinecap="round" fill="none" />
        <ellipse cx="353" cy="120" rx="65" ry="28" fill="url(#heroTree)" />
        <ellipse cx="387" cy="113" rx="55" ry="29" fill="url(#heroTree)" />
        <ellipse cx="326" cy="134" rx="41" ry="22" fill="url(#heroTree)" opacity=".95" />
      </g>

      {/* Foreground shadows */}
      <path d="M142 190c9-12 26-21 50-24" stroke="#103d24" strokeWidth="7" strokeLinecap="round" opacity=".42" fill="none" />
      <path d="M0 224c41 9 82 6 125-10" stroke="#173f24" strokeWidth="18" opacity=".32" fill="none" />
    </svg>
  )
}
