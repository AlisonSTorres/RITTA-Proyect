import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const envCandidates = [
  path.resolve(__dirname, '.env.local'),
  path.resolve(__dirname, '.env'),
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../../.env.local'),
  path.resolve(__dirname, '../../.env'),
];

const loadedEnvFiles = new Set<string>();

for (const candidate of envCandidates) {
  if (!loadedEnvFiles.has(candidate) && fs.existsSync(candidate)) {
    dotenv.config({ path: candidate, override: false });
    loadedEnvFiles.add(candidate);
  }
}

if (loadedEnvFiles.size > 0) {
  console.info(`INFO: Variables de entorno cargadas para Expo desde: ${Array.from(loadedEnvFiles).join(', ')}`);
} else {
  console.warn('ADVERTENCIA: No se encontró archivo .env para la app móvil en las rutas habituales.');
}

const rawSiteKey = process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY ?? '';
const normalizedSiteKey = typeof rawSiteKey === 'string' ? rawSiteKey.trim() : '';

const recaptchaSiteKey = normalizedSiteKey.length > 0 ? normalizedSiteKey : '';

export default () => ({
  expo: {
    name: 'myapp',
    slug: 'myapp',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'myapp',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      permissions: [
        'android.permission.CAMERA',
        'android.permission.RECORD_AUDIO',
        'android.permission.CAMERA',
        'android.permission.RECORD_AUDIO',
      ],
      package: 'com.anonymous.myapp',
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
        },
      ],
      [
        'expo-camera',
        {
          cameraPermission: 'Allow $(PRODUCT_NAME) to access your camera',
          microphonePermission: 'Allow $(PRODUCT_NAME) to access your microphone',
          recordAudioAndroid: true,
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      recaptchaKey: process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY,
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
    },
  },
});