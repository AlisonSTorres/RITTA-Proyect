import axios from 'axios';
import config from '../config/env';

const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}';
interface RecaptchaV3WebResponse {
  success: boolean;
  challenge_ts: string;
  hostname: string;
  score?: number;
  action?: string;
  'error-codes'?: string[];
}

/**
* @param token Token generado por reCAPTCHA v3 en el cliente.
* @param expectedAction Acción esperada definida al ejecutar `grecaptcha.execute` en el cliente.
* @param remoteIp IP opcional del cliente para reforzar la verificación.
*/
export const verifyRecaptchaV3 = async (
  token: string,
  expectedAction?: string,
  remoteIp?: string,
): Promise<boolean> => {
  const secretKey = config.RECAPTCHA_V3_SECRET_KEY;

  if (!secretKey) {
    console.error('Error: La clave secreta de reCAPTCHA v3 no está configurada.');
    if (config.NODE_ENV === 'production') return false;
    console.warn('ADVERTENCIA: Saltando verificación reCAPTCHA v3 en entorno no productivo por falta de clave secreta.');
    return true; 
  }

  if (!token) {
    console.log('Verificación reCAPTCHA v3 fallida: No se proporcionó token.');
    return false;
  }

  try {
    console.log('Verificando token reCAPTCHA v3...');
     const params: Record<string, string> = {
      secret: secretKey,
      response: token,
    };

    if (remoteIp) {
      params.remoteip = remoteIp;
    }
    const response = await axios.post<RecaptchaV3WebResponse>(RECAPTCHA_VERIFY_URL, null, {
      params,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
      },
      timeout: 5000,
    });
    const { success, score, action, 'error-codes': errorCodes } = response.data;
    console.log('Respuesta de verificación reCAPTCHA v3:', response.data);

    if (!success) {
      console.warn('Verificación reCAPTCHA v3 fallida por Google (success: false):', errorCodes);
      return false;
    }
     if (expectedAction && action !== expectedAction) {
      console.warn(
        `Verificación reCAPTCHA v3 fallida: la acción recibida '${action}' no coincide con la esperada '${expectedAction}'.`,
      );
      return false;
    }

    if (typeof score === 'number') {
      const threshold = config.RECAPTCHA_V3_THRESHOLD ?? 0.5;
      if (score < threshold) {
        console.warn(
          `Verificación reCAPTCHA v3 fallida: score ${score} menor al umbral requerido ${threshold}.`,
        );
        return false;
      }
    } else {
      console.warn('Verificación reCAPTCHA v3: no se recibió score numérico en la respuesta.');
    }
    console.log('Verificación reCAPTCHA v3 exitosa.');
    return true;

  } catch (error: any) {
    console.error('Error durante la llamada a la API de verificación reCAPTCHA v3:', error.message);
    return false;
  }
};