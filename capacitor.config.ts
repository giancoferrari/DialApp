import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'xyz.dialgolf.app',
  appName: 'Dial',
  webDir: 'dist',
  ios: {
    contentInset: 'always',
    backgroundColor: '#EDE8D4',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 700,
      backgroundColor: '#1F3A2A',
      showSpinner: false,
    },
    Keyboard: {
      resize: 'native',
    },
  },
}

export default config
