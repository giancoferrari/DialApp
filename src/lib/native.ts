import { Capacitor } from '@capacitor/core'

// Native-only setup for the Capacitor iOS (and future Android) shell.
// On the web (Vercel) this is a no-op, so the same codebase ships everywhere.
export async function initNative(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  // Status bar: dark text/icons over the cream top bar.
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: Style.Light })
  } catch { /* plugin unavailable */ }

  // Keyboard: don't let it scroll the whole webview (we handle the chat
  // ourselves via the visualViewport API).
  try {
    const { Keyboard } = await import('@capacitor/keyboard')
    await Keyboard.setScroll({ isDisabled: true })
  } catch { /* plugin unavailable */ }

  // Hide the splash once the app shell is ready.
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide()
  } catch { /* plugin unavailable */ }
}

// Called from lib/theme.ts's applyTheme() so the native status bar tracks
// the app's resolved theme — mirrors initNative()'s Style.Light-for-light
// convention above.
export async function setNativeTheme(theme: 'light' | 'dark'): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light })
  } catch { /* plugin unavailable */ }
}

// Light haptic tap — safe to call anywhere; no-ops on web.
export async function tapHaptic(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch { /* ignore */ }
}

export const isNative = (): boolean => Capacitor.isNativePlatform()
