import React, { useMemo, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

interface RecaptchaModalProps {
  visible: boolean;
  siteKey: string;
  onToken: (token: string) => void;
  onClose: () => void;
  onError?: (message: string) => void;
}

const RecaptchaModal: React.FC<RecaptchaModalProps> = ({
  visible,
  siteKey,
  onToken,
  onClose,
  onError,
}) => {
  const [webviewKey, setWebviewKey] = useState(0);

  const htmlContent = useMemo(() => `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      <script src="https://www.google.com/recaptcha/api.js" async defer></script>
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: #f5f5f5;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          font-family: Arial, Helvetica, sans-serif;
        }
        .wrapper {
          padding: 16px;
          width: 100%;
          box-sizing: border-box;
          display: flex;
          justify-content: center;
        }
      </style>
      <script type="text/javascript">
        function postMessage(data) {
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(data));
        }
        function onCaptchaSuccess(token) {
          postMessage({ type: 'success', token: token });
        }
        function onCaptchaExpired() {
          postMessage({ type: 'expired' });
        }
        function onCaptchaError() {
          postMessage({ type: 'error', message: 'No se pudo completar la verificación del CAPTCHA.' });
        }
      </script>
    </head>
    <body>
      <div class="wrapper">
        <div
          class="g-recaptcha"
          data-sitekey="${siteKey}"
          data-callback="onCaptchaSuccess"
          data-expired-callback="onCaptchaExpired"
          data-error-callback="onCaptchaError"
        ></div>
      </div>
    </body>
  </html>`, [siteKey]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data ?? '{}');
      if (data.type === 'success' && typeof data.token === 'string') {
        onToken(data.token);
        setWebviewKey((prev) => prev + 1);
      } else if (data.type === 'expired') {
        setWebviewKey((prev) => prev + 1);
      } else if (data.type === 'error') {
        onError?.(typeof data.message === 'string' ? data.message : 'Ocurrió un error con el CAPTCHA.');
        setWebviewKey((prev) => prev + 1);
      }
    } catch (error) {
      onError?.('No se pudo procesar la respuesta del CAPTCHA.');
    }
  };

  const handleClose = () => {
    setWebviewKey((prev) => prev + 1);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      presentationStyle="overFullScreen"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Verificación de seguridad</Text>
          <Text style={styles.subtitle}>
            Completa el siguiente desafío CAPTCHA para continuar con tu inicio de sesión.
          </Text>
          <View style={styles.webviewWrapper}>
            <WebView
              key={webviewKey}
              originWhitelist={["*"]}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              source={{ html: htmlContent, baseUrl: 'https://www.google.com' }}
              onMessage={handleMessage}
            />
          </View>
          <TouchableOpacity onPress={handleClose} style={styles.cancelButton} accessibilityRole="button">
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 16,
  },
  webviewWrapper: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  cancelButton: {
    marginTop: 16,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelButtonText: {
    color: '#1d4ed8',
    fontWeight: '600',
    fontSize: 15,
  },
});

export default RecaptchaModal;