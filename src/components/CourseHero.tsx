import { useState } from 'react'
import CourseHeroArt from './CourseHeroArt'

// ── Home hero ──────────────────────────────────────────────────────────────
// Shows a real course photo/illustration if you drop one in `public/`,
// otherwise falls back to the built-in SVG. To use a real image:
//   • save it as  dial-app/public/course-hero.jpg
//   • landscape ~3:2 (e.g. 1500 × 1000 px), keep the sky pale so it blends
//     into the cream background; the green/flag toward the lower-middle.
const HERO_SRC = '/course-hero.jpg'

interface Props {
  // Hero band proportions. Mobile uses a taller band so the illustration's
  // pale sky fills up behind the floating header (reaching the very top of the
  // screen) while the green/flag stay low near the rank card.
  aspect?: string
  // Where the bottom fade begins (% of height). Tuned per-aspect so the faded
  // band above the rank card is the same visual size regardless of height.
  fadeStart?: number
}

export default function CourseHero({ aspect = '390 / 318', fadeStart = 55 }: Props) {
  const [failed, setFailed] = useState(false)

  // `cover` trims a little off the sides of a 3:2 photo; the full image height
  // shows, so the horizon sits at a fixed fraction of the band.
  //
  // Bottom fade — the reference dissolves the illustration's foreground green
  // into the cream background (no hard rectangle edge). A bottom mask gradient
  // fades the lower band to transparent so the cream shows through and the rank
  // card sits over a soft, blended transition rather than a seam.
  const fade = `linear-gradient(to bottom, #000 0%, #000 ${fadeStart}%, rgba(0,0,0,0) 100%)`
  return (
    <div style={{
      width: '100%', aspectRatio: aspect, overflow: 'hidden',
      WebkitMaskImage: fade, maskImage: fade,
    }}>
      {failed ? (
        <CourseHeroArt />
      ) : (
        <img
          src={HERO_SRC}
          alt=""
          className="course-hero-media"
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 62%', display: 'block' }}
        />
      )}
    </div>
  )
}
