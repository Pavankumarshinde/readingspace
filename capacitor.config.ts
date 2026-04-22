import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.readingspace.app',
  appName: 'Reading Space',
  webDir: 'public',
  server: {
    url: 'https://readingspace.vercel.app',
    cleartext: true
  },
  plugins: {
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#ffffff'
    }
  }
};

export default config;
