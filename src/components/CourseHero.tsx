import { useState } from 'react'
import CourseHeroArt from './CourseHeroArt'

// ── Home hero ──────────────────────────────────────────────────────────────
// Shows a real course photo/illustration if you drop one in `public/`,
// otherwise falls back to the built-in SVG. To use a real image:
//   • save it as  dial-app/public/course-hero.jpg
//   • landscape ~3:2 (e.g. 1500 × 1000 px), keep the sky pale so it blends
//     into the cream background; the green/flag toward the lower-middle.
const HERO_SRC = '/course-hero.jpg'

export default function CourseHero() {
  const [failed, setFailed] = useState(false)

  // Slightly taller than 3:2 (matches the reference's hero band, whose sky
  // runs up behind the greeting). `cover` trims a little off the sides of a
  // 3:2 photo; position biases toward the green/flag in the lower half.
  //
  // Bottom fade — the reference dissolves the illustration's foreground green
  // into the cream background (no hard rectangle edge). A bottom mask gradient
  // fades the last ~45% of the image to transparent so the cream shows through
  // and the rank card sits over a soft, blended transition rather than a seam.
  const fade = 'linear-gradient(to bottom, #000 0%, #000 55%, rgba(0,0,0,0) 100%)'
  return (
    <div style={{
      width: '100%', aspectRatio: '390 / 318', overflow: 'hidden',
      WebkitMaskImage: fade, maskImage: fade,
    }}>
      {failed ? (
        <CourseHeroArt />
      ) : (
        <img
          src={HERO_SRC}
          alt=""
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 62%', display: 'block' }}
        />
      )}
    </div>
  )
}
