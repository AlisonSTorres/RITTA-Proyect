import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';


const envCandidates = [
  path.resolve(__dirname, '../..', '.env.local'),
  path.resolve(__dirname, '../..', '.env'),
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../../../..', '.env.local'),
  path.resolve(__dirname, '../../../..', '.env'),
];

const loadedEnvFiles = new Set<string>();

for (const candidate of envCandidates) {
  if (!loadedEnvFiles.has(candidate) && fs.existsSync(candidate)) {
    dotenv.config({ path: candidate, override: false });
    loadedEnvFiles.add(candidate);
  }
}

if (loadedEnvFiles.size > 0) {
  console.info(`INFO: Variables de entorno cargadas desde: ${Array.from(loadedEnvFiles).join(', ')}`);
} else {
  console.warn('ADVERTENCIA: No se encontró ningún archivo .env en las rutas habituales.');
}

interface AppConfig {
  NODE_ENV: string;
  PORT: number;
  DB_HOST?: string;
  DB_PORT?: number;
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD?: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: number;


  EMAIL_HOST?: string;       
  EMAIL_PORT?: number;      
  EMAIL_SECURE?: boolean;   
  EMAIL_USER?: string;       
  EMAIL_PASS?: string;      
  EMAIL_FROM?: string;

  RECAPTCHA_V3_SECRET_KEY?: string;
  RECAPTCHA_V3_THRESHOLD?: number;
}
const sanitizeString = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const parseRecaptchaThreshold = (value?: string): number => {
  if (!value) {
    return 0.5;
  }

  const parsed = Number.parseFloat(value);

  if (!Number.isFinite(parsed)) {
    console.warn(
      `ADVERTENCIA: RECAPTCHA_V3_THRESHOLD='${value}' no es un número válido. Se usará el valor por defecto 0.5.`,
    );
    return 0.5;
  }

  if (parsed < 0 || parsed > 1) {
    console.warn(
      `ADVERTENCIA: RECAPTCHA_V3_THRESHOLD='${value}' está fuera del rango permitido (0-1). Se usará el valor por defecto 0.5.`,
    );
    return 0.5;
  }

  return parsed;
};

const recaptchaSecretEnvKeys = [
  'RECAPTCHA_V3_SECRET_KEY',
  'RECAPTCHA_SECRET_KEY',
  'RECAPTCHA_PRIVATE_KEY',
];

let rawRecaptchaSecret: string | undefined;
let recaptchaSecretSource: string | undefined;

for (const key of recaptchaSecretEnvKeys) {
  const candidate = process.env[key];
  if (typeof candidate === 'string' && candidate.length > 0) {
    rawRecaptchaSecret = candidate;
    recaptchaSecretSource = key;
    break;
  }
}

const sanitizedRecaptchaSecret = sanitizeString(rawRecaptchaSecret);

if (rawRecaptchaSecret && !sanitizedRecaptchaSecret) {
  console.warn(
    `ADVERTENCIA: ${recaptchaSecretSource ?? 'RECAPTCHA_V3_SECRET_KEY'} está definida pero queda vacía tras eliminar espacios. Se ignorará el valor.`,
  );
}


const config: AppConfig = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '3000', 10),
  DB_HOST: process.env.DB_HOST ?? 'localhost',
  DB_PORT: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432, 
  DB_NAME: process.env.DB_NAME ?? 'db_dev_default',
  DB_USER: process.env.DB_USER ?? 'user_dev_default',
  DB_PASSWORD: process.env.DB_PASSWORD ?? '',
  JWT_SECRET: process.env.JWT_SECRET ?? 'valor_por_defecto_inseguro_para_desarrollo',
  JWT_EXPIRES_IN: parseInt(process.env.JWT_EXPIRES_IN_SECONDS ?? '28800', 10), // 8 horas por defecto

  EMAIL_HOST: process.env.EMAIL_HOST,
  EMAIL_PORT: process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT, 10) : 587, 
  EMAIL_SECURE: process.env.EMAIL_SECURE === 'true',
  EMAIL_USER: process.env.EMAIL_USER, 
  EMAIL_PASS: process.env.EMAIL_PASS, 
  EMAIL_FROM: process.env.EMAIL_FROM ?? '"RITTA" <no-reply@ritta.com>',
  
  RECAPTCHA_V3_SECRET_KEY: sanitizedRecaptchaSecret,
  RECAPTCHA_V3_THRESHOLD: parseRecaptchaThreshold(process.env.RECAPTCHA_V3_THRESHOLD),
};

if (!process.env.DB_NAME) {
    console.warn(`ADVERTENCIA: DB_NAME no definida en .env. Usando: ${config.DB_NAME}`);
}
if (!process.env.DB_USER) {
    console.warn(`ADVERTENCIA: DB_USER no definido en .env. Usando: ${config.DB_USER}`);
}
if (!process.env.DB_PASSWORD) {
    console.warn(`ADVERTENCIA: DB_PASSWORD no definido en .env. Usando string vacío.`);
}
if (!process.env.JWT_SECRET) {
  console.warn(
    'ADVERTENCIA: La variable de entorno JWT_SECRET no está definida. Usando clave por defecto insegura.'
  );
}
if (!config.EMAIL_HOST || !config.EMAIL_USER || !config.EMAIL_PASS) {
    console.warn(
      'ADVERTENCIA: La configuración de email (EMAIL_HOST, EMAIL_USER, EMAIL_PASS) parece incompleta en .env. El envío de correos podría fallar.'
    );
}
if (config.NODE_ENV === 'production' && !config.RECAPTCHA_V3_SECRET_KEY) {
    console.warn('ADVERTENCIA: RECAPTCHA_V3_SECRET_KEY no está definida en .env para producción.');
}
if (config.RECAPTCHA_V3_SECRET_KEY) {
  if (recaptchaSecretSource && recaptchaSecretSource !== 'RECAPTCHA_V3_SECRET_KEY') {
    console.info(
      `INFO: Usando ${recaptchaSecretSource} como fuente de la clave secreta reCAPTCHA v3. Define RECAPTCHA_V3_SECRET_KEY para evitar ambigüedad.`,
    );
  }
  if (rawRecaptchaSecret && rawRecaptchaSecret !== config.RECAPTCHA_V3_SECRET_KEY) {
    console.info('INFO: RECAPTCHA_V3_SECRET_KEY se normalizó eliminando espacios en blanco.');
  }
}


export default config;