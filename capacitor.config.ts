import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.axon.kenya',
  appName: 'Axon',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '770691922911-bcibeedoho5qfm1na7di312rsom4iv6d.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
    StatusBar: {
      overlaysWebView: false,
      style: "light",
      backgroundColor: "#FFFFFF"
    },
  },
};

export default config;
