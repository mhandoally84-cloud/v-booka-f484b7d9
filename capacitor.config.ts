import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'tz.ac.mzumbe.examvenues',
  appName: 'Mzumbe Exam Booking',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // For live development against the Lovable preview, uncomment:
    // url: 'https://quickbookvenues.lovable.app',
    // cleartext: true,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
