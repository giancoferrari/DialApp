import type { RefObject } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

// ─────────────────────────────────────────────────────────────────────────
// The app's one shared "mount stagger" — every screen's top-level content
// container should use this instead of hand-rolling its own GSAP block.
// Animates the container's direct children: y:22 → 0, opacity 0 → 1,
// 0.58s, stagger 0.07, power3.out. Gated on prefers-reduced-motion (the
// reduced branch snaps everything straight to its visible end state).
//
//   const ref = useRef<HTMLDivElement>(null)
//   useStaggerMount(ref)
//   return <div ref={ref}>...</div>
//
// `dependencies` re-runs the animation when the listed values change (e.g.
// a filtered list or a query that just resolved). `delay` offsets the start
// (in seconds) — used sparingly, only where a screen already relied on one.
// ─────────────────────────────────────────────────────────────────────────
export function useStaggerMount(
  ref: RefObject<HTMLElement | null>,
  opts?: { dependencies?: unknown[]; delay?: number }
) {
  const dependencies = opts?.dependencies ?? []
  const delay = opts?.delay ?? 0

  useGSAP(() => {
    if (!ref.current) return
    const children = Array.from(ref.current.children)
    if (!children.length) return

    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(
        children,
        { opacity: 0, y: 22 },
        { opacity: 1, y: 0, duration: 0.58, stagger: 0.07, ease: 'power3.out', delay }
      )
    })
    mm.add('(prefers-reduced-motion: reduce)', () => {
      gsap.set(children, { opacity: 1, y: 0 })
    })
    return () => mm.revert()
  }, { scope: ref, dependencies })
}
