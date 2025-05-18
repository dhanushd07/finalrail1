
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.55facd3ba0e447bb8fd5db1f87f27e17',
  appName: 'finalrail1',
  webDir: 'dist',
  server: {
    url: 'https://55facd3b-a0e4-47bb-8fd5-db1f87f27e17.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    CapacitorHttp: {
      enabled: true
    }
  },
  android: {
    useLegacyBridge: true // This enables better compatibility with USB devices
  }
};

export default config;
