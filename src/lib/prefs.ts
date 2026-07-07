// Local game-default preferences (no DB needed) — read by ScorecardView and
// MatchesView's NewMatchModal to seed a new round/match, and written by
// SettingsView's "Game defaults" + "Preferred tee" rows.
export type Prefs = {
  defaultHoles: 9 | 18
  teePreference: string
}

const DEFAULT_PREFS: Prefs = {
  defaultHoles: 18,
  teePreference: 'white',
}

export function loadPrefs(): Prefs {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem('dial_prefs') ?? '{}') }
  } catch { return DEFAULT_PREFS }
}

export function savePrefs(p: Prefs) {
  try { localStorage.setItem('dial_prefs', JSON.stringify(p)) } catch { /* */ }
}
