// Theme plumbing — light/dark/system, backed by CSS custom properties (see
// index.css :root / [data-theme="dark"]) so components never read this
// directly; they just keep using lib/tokens.ts's color.* exports.
import { setNativeTheme } from './native'

export type ThemePref = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'dial_theme'
const LIGHT_META_THEME_COLOR = '#F8F3E7'
const DARK_META_THEME_COLOR = '#141712'

export function getTheme(): ThemePref {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
  } catch { /* localStorage unavailable */ }
  return 'system'
}

export function saveTheme(pref: ThemePref) {
  try { localStorage.setItem(STORAGE_KEY, pref) } catch { /* ignore */ }
}

function resolve(pref: ThemePref): ResolvedTheme {
  if (pref === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return pref
}

function setMetaThemeColor(resolved: ResolvedTheme) {
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', resolved === 'dark' ? DARK_META_THEME_COLOR : LIGHT_META_THEME_COLOR)
}

export function applyTheme(pref: ThemePref) {
  const resolved = resolve(pref)
  document.documentElement.dataset.theme = resolved
  setMetaThemeColor(resolved)
  void setNativeTheme(resolved)
}

let systemListenerAttached = false

// Call once, before the app renders, to avoid a flash of the wrong theme.
export function initTheme() {
  applyTheme(getTheme())

  if (systemListenerAttached) return
  systemListenerAttached = true
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getTheme() === 'system') applyTheme('system')
  })
}
