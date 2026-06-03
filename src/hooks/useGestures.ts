import { useEffect, useRef, useState } from 'react'

// Swipe from the left screen edge to the right → triggers `onBack`.
// Use on drill-in screens (profiles, settings, chat threads).
export function useEdgeSwipeBack(onBack: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return
    let startX = 0, startY = 0, tracking = false
    const onStart = (e: TouchEvent) => {
      const t = e.touches[0]
      if (t && t.clientX <= 26) { tracking = true; startX = t.clientX; startY = t.clientY }
    }
    const onEnd = (e: TouchEvent) => {
      if (!tracking) return
      tracking = false
      const t = e.changedTouches[0]
      if (!t) return
      const dx = t.clientX - startX
      const dy = Math.abs(t.clientY - startY)
      if (dx > 72 && dy < 56) onBack()
    }
    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchend', onEnd)
    }
  }, [onBack, enabled])
}

// Drag a bottom sheet down to dismiss. Spread `handlers` on the drag area
// (e.g. the header/grabber) and apply `dragStyle` to the sheet panel.
export function useSwipeDownDismiss(onClose: () => void) {
  const [dragY, setDragY] = useState(0)
  const startY = useRef<number | null>(null)

  const onTouchStart = (e: React.TouchEvent) => { startY.current = e.touches[0]?.clientY ?? null }
  const onTouchMove  = (e: React.TouchEvent) => {
    if (startY.current == null) return
    const dy = (e.touches[0]?.clientY ?? 0) - startY.current
    if (dy > 0) setDragY(dy)
  }
  const onTouchEnd = () => {
    if (dragY > 90) onClose()
    else setDragY(0)
    startY.current = null
  }

  const dragStyle: React.CSSProperties = {
    transform: dragY ? `translateY(${dragY}px)` : undefined,
    transition: dragY ? 'none' : 'transform 0.25s cubic-bezier(0.22,1,0.36,1)',
  }
  return { dragStyle, dragHandlers: { onTouchStart, onTouchMove, onTouchEnd } }
}
