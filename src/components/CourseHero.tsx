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
  return (
    <div style={{ width: '100%', aspectRatio: '390 / 318', overflow: 'hidden' }}>
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
