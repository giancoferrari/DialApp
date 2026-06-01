import { createPortal } from 'react-dom'

// Renders children at document.body so position:fixed overlays are always
// anchored to the viewport — never trapped by an ancestor's transform/filter
// (e.g. the GSAP page-transition on the app shell). This is what makes
// modals/sheets reliable on mobile.
export default function Portal({ children }: { children: React.ReactNode }) {
  return createPortal(children, document.body)
}
