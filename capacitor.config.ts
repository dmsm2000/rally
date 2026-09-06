import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rally.app',
  appName: 'RALLY',
  webDir: 'dist/rally/browser',
  server: {
    androidScheme: 'https'
  }
};

export default config;
