import 'node:process';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_RECAPTCHA_SITE_KEY?: string;
    }
  }
}

export {};