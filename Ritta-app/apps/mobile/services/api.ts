import { Platform } from 'react-native';

// URLS de desarrollo por plataforma
// Web (navegador en tu PC) → backend local:
const WEB_LOCAL = 'http://localhost:3000/api';

const DEVICE_LAN = 'http://192.168.1.4:3000/api'; // para expo go, cambiar si la IP cambia

// Emulador Android (si se usa) → descomenta esta y usa en lugar de DEVICE_LAN:
// const ANDROID_EMULATOR_LOCAL = 'http://10.0.2.2:3000/api';


export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  (Platform.OS === 'web' ? WEB_LOCAL : DEVICE_LAN);

console.log('API Base URL:', API_BASE_URL);


export interface ApiUser {
  id: string | number;
  rut: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'INSPECTOR' | 'PARENT' | null;
}

export interface ForcePasswordChangeDetails {
  message: string;
  forceChangePassword: true;
  email: string;
  tempToken: string;
}

export interface MfaRequiredDetails {
  message: string;
  mfaRequired: true;
  email: string;
}

export interface LoginSuccessDetails {
  message: string;
  token: string;
  user: ApiUser;
  forceChangePassword?: false;
  mfaRequired?: false;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ForgotPasswordApiResponse {
  message: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

export interface ResetPasswordApiResponse {
  message: string;
}

interface ApiErrorDetail {
  message: string;
  field?: string;
  location?: string;
}

export class DetailedApiError extends Error {
  public errors?: ApiErrorDetail[];
  public statusCode?: number;

  constructor(message: string, errors?: ApiErrorDetail[], statusCode?: number) {
    super(message);
    this.name = 'DetailedApiError';
    this.errors = errors;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, DetailedApiError.prototype);
  }
}

export type LoginApiResponse = ForcePasswordChangeDetails | MfaRequiredDetails | LoginSuccessDetails;
export type ForceChangePasswordApiResponse = MfaRequiredDetails | LoginSuccessDetails;
export type VerifyMfaApiResponse = LoginSuccessDetails;

interface LoginPayload {
  rut: string;
  password: string;
  captchaToken?: string;
}

interface CompleteForcePasswordPayload {
  newPassword: string;
  confirmPassword: string;
}

interface VerifyMfaPayload {
  email: string;
  code: string;
}

// --- Funciones del Servicio usando Fetch ---
const handleApiResponse = async (response: Response) => {
  const responseData = await response.json();
  if (!response.ok) {
    const errorMessage = responseData.message || responseData.error || `Error HTTP: ${response.status}`;
    if (responseData.errors && Array.isArray(responseData.errors)) {
      throw new DetailedApiError(errorMessage, responseData.errors, response.status);
    }
    throw new DetailedApiError(errorMessage, undefined, response.status);
  }
  return responseData;
};

export const loginUser = async (payload: LoginPayload): Promise<LoginApiResponse> => {
  const url = `${API_BASE_URL}/auth/login`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await handleApiResponse(response) as LoginApiResponse;
  } catch (error) {
    if (error instanceof Error) throw error;
    console.error('Fetch loginUser error:', error);
    throw new Error('No se pudo conectar al servidor o ocurrió un error inesperado durante el login.');
  }
};

export const completeForcePasswordApi = async (
  payload: CompleteForcePasswordPayload,
  tempToken: string
): Promise<ForceChangePasswordApiResponse> => {
  const url = `${API_BASE_URL}/auth/force-change-password`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tempToken}`,
      },
      body: JSON.stringify(payload),
    });
    return await handleApiResponse(response) as ForceChangePasswordApiResponse;
  } catch (error) {
    if (error instanceof Error) throw error;
    console.error('Fetch completeForcePasswordApi error:', error);
    throw new Error('No se pudo conectar al servidor o ocurrió un error inesperado al cambiar la contraseña.');
  }
};

export const verifyMfaApi = async (payload: VerifyMfaPayload): Promise<VerifyMfaApiResponse> => {
  const url = `${API_BASE_URL}/auth/verify-mfa`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await handleApiResponse(response) as VerifyMfaApiResponse;
  } catch (error) {
    if (error instanceof Error) throw error;
    console.error('Fetch verifyMfaApi error:', error);
    throw new Error('No se pudo conectar al servidor o ocurrió un error inesperado al verificar MFA.');
  }
};

export const requestPasswordResetApi = async (
  payload: ForgotPasswordPayload
): Promise<ForgotPasswordApiResponse> => {
  const url = `${API_BASE_URL}/auth/forgot-password`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await handleApiResponse(response) as ForgotPasswordApiResponse;
  } catch (error) {
    if (error instanceof Error) throw error;
    console.error('Fetch requestPasswordResetApi error:', error);
    throw new Error('No se pudo conectar al servidor o ocurrió un error inesperado al solicitar el reseteo de contraseña.');
  }
};

export const resetPasswordApi = async (
  payload: ResetPasswordPayload
): Promise<ResetPasswordApiResponse> => {
  const url = `${API_BASE_URL}/auth/reset-password`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await handleApiResponse(response) as ResetPasswordApiResponse;
  } catch (error) {
    if (error instanceof Error) throw error;
    console.error('Fetch resetPasswordApi error:', error);
    throw new Error('No se pudo conectar al servidor o ocurrió un error inesperado al restablecer la contraseña.');
  }
};
