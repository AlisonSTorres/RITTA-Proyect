import { useCallback, useMemo, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import RutInput from '@/components/ui/input/RutInput';
import PasswordInput from '@/components/ui/input/PasswordInput';
import AuthBackground from '@/components/layout/AuthBackground';
import PrimaryButton from '@/components/ui/buttons/PrimaryButton';
import TextLinkButton from '@/components/ui/buttons/TextLinkButton';
import RecaptchaModal from '@/components/security/RecaptchaModal';
import type { DetailedApiError } from '@/services/api';
import Constants from 'expo-constants';
const isDetailedApiError = (error: unknown): error is DetailedApiError => {
  return (
    error instanceof Error &&
    'name' in error &&
    (error as { name: unknown }).name === 'DetailedApiError'
  );
};

export default function LoginScreen() {
  const { login } = useAuth();
  const [rut, setRut] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captchaVisible, setCaptchaVisible] = useState(false);
  const [captchaMessage, setCaptchaMessage] = useState<string | null>(null);
  const recaptchaSiteKey = useMemo(() => {
    const candidates: unknown[] = [];

    const envValue = process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY;
    if (typeof envValue === 'string') {
      candidates.push(envValue);
    }

    const expoExtra = (Constants?.expoConfig?.extra ?? {}) as Record<string, unknown>;
    const manifestExtra = (Constants?.manifest?.extra ?? {}) as Record<string, unknown>;
    const globalEnv =
      (globalThis as Record<string, unknown> | undefined)?.['EXPO_PUBLIC_RECAPTCHA_SITE_KEY'];

    candidates.push(
      expoExtra.recaptchaSiteKey,
      expoExtra.captchaSiteKey,
      expoExtra.EXPO_PUBLIC_RECAPTCHA_SITE_KEY,
      manifestExtra.recaptchaSiteKey,
      manifestExtra.captchaSiteKey,
      manifestExtra.EXPO_PUBLIC_RECAPTCHA_SITE_KEY,
      globalEnv,
    );

    for (const candidate of candidates) {
      if (typeof candidate === 'string') {
        const trimmed = candidate.trim();
        if (trimmed.length > 0) {
          const globalRecord = globalThis as Record<string, unknown>;
          if (typeof globalRecord['EXPO_PUBLIC_RECAPTCHA_SITE_KEY'] !== 'string') {
            globalRecord['EXPO_PUBLIC_RECAPTCHA_SITE_KEY'] = trimmed;
          }
          return trimmed;
        }
      }
    }

    return '';
  }, []);
  const markCaptchaRequired = useCallback((message?: string) => {
    if (!recaptchaSiteKey) {
      const warningMessage =
        'Se requiere completar un CAPTCHA, pero no hay una clave de sitio configurada en la aplicación. Contacta al administrador del sistema.';
      setCaptchaVisible(false);
      setCaptchaMessage(warningMessage);
      alert(warningMessage);
      return;
    }

    setCaptchaMessage(
      message ?? 'Completa el CAPTCHA para continuar con el inicio de sesión.'
    );
    setCaptchaVisible(true);
  }, [recaptchaSiteKey]);

  const attemptLogin = useCallback(async (captchaToken?: string) => {
    if (!rut.trim() || !password.trim()) {
      return;
    }

    setCaptchaMessage(null);
    setIsSubmitting(true);

    try {
      await login(rut.trim(), password, captchaToken);
      setCaptchaVisible(false);
      setCaptchaMessage(null);
    } catch (error: unknown) {
      if (isDetailedApiError(error)) {
        const message = error.message ?? 'Ocurrió un error durante el inicio de sesión.';
        const normalized = message.toLowerCase();
        const isCaptchaRelated = normalized.includes('captcha') || normalized.includes('verificación de seguridad');

        if (isCaptchaRelated) {
          const fallbackMessage = normalized.includes('fallida')
            ? 'El CAPTCHA enviado no fue válido. Inténtalo nuevamente.'
            : undefined;
          markCaptchaRequired(fallbackMessage);
          return;
        }

        alert(message);
        return;
      }
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('Ocurrió un error desconocido');
      }
    
    } finally {
      setIsSubmitting(false);
    }
  }, [login, markCaptchaRequired, password, rut]);

  const handleLoginPress = useCallback(() => {
    attemptLogin();
  }, [attemptLogin]);

  const handleCaptchaToken = useCallback((token: string) => {
    setCaptchaVisible(false);
    setCaptchaMessage(null);
    attemptLogin(token);
  }, [attemptLogin]);

  const handleCaptchaClose = useCallback(() => {
    setCaptchaVisible(false);
    setCaptchaMessage('Debes completar el CAPTCHA para continuar con el inicio de sesión.');
  }, []);

  return (
    <AuthBackground>
      {/* Contenedor */}
      <SafeAreaView className="flex-1">
        <ScrollView>
          <View className="flex-1 items-center justify-start">
            <Text className="text-3xl font-bold text-center text-gray-900">Bienvenido</Text>
            <Text className="text-gray-400 text-center mt-1 mb-6">Inicia sesión para continuar</Text>

            {/* Seccion datos */}
            <View className="space-y-4">
              <Text className="text-sm font-semibold text-gray-500 mb-1 ml-1">RUT</Text>
              <RutInput
                value={rut}
                onChangeText={setRut}
                placeholder="12348678-9"
                className="bg-white p-4 rounded-lg border border-gray-200"
              />
            
              <Text className="text-sm font-semibold text-gray-500 mb-2 mt-2 ml-1">Contraseña</Text>
              <PasswordInput
                value={password}
                onChangeText={setPassword}
                placeholder="Ingrese su Contraseña"
                className="bg-white p-4 rounded-lg border border-gray-200"
              />

              {/* Botón Ingresar */}
              <View className="flex-1 justify-center items-center p-2">
                <View className="w-1/2">
                  <PrimaryButton
                    title={isSubmitting ? 'Ingresando...' : 'Iniciar Sesión'}
                    onPress={handleLoginPress}
                    disabled={isSubmitting || !rut.trim() || !password.trim()}
                  />
                </View>
                {captchaMessage ? (
                  <Text className="text-sm text-red-500 text-center mt-3 px-4">{captchaMessage}</Text>
                ) : null}
              </View>

              {/* Contraseña olvidada */}
              <View className="items-center">
                <TextLinkButton
                  title="¿Olvidaste tu contraseña?"
                  onPress={() => router.push('/forgot-password')}
                />
              </View>


              <Text className="text-xs text-gray-500 text-center mt-2">
                (*) Si no cuentas con tus credenciales, ponte en contacto con tu entidad académica
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
      
      {recaptchaSiteKey ? (
        <RecaptchaModal
          visible={captchaVisible}
          siteKey={recaptchaSiteKey}
          onToken={handleCaptchaToken}
          onClose={handleCaptchaClose}
          onError={(message) => setCaptchaMessage(message)}
        />
      ) : null}
    </AuthBackground>
  );
}