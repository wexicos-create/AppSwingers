import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'live.appswinger.app',
  appName: 'AppSwinger',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
};

export default config;
