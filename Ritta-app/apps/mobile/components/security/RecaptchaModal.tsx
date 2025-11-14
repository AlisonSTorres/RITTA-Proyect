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

  const htmlContent = useMemo(
    () => `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
     <script src="https://www.google.com/recaptcha/api.js?render=${siteKey}" async defer></script>
      <style>
       :root {
          color-scheme: light;
        }
        body {
          margin: 0;
          padding: 0;
          background-color: #f5f5f5;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          font-family: Arial, Helvetica, sans-serif;
          color: #111827;
        }
        .wrapper {
          padding: 16px;
          width: 100%;
          max-width: 320px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
      .status {
          text-align: center;
        }
        .spinner {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 4px solid rgba(37, 99, 235, 0.25);
          border-top-color: #2563eb;
          margin: 0 auto 12px;
          animation: spin 1s linear infinite;
        }
        .hidden {
          display: none !important;
        }
        button {
          padding: 10px 16px;
          border-radius: 999px;
          border: none;
          background-color: #2563eb;
          color: #ffffff;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }
       button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .legal {
          font-size: 11px;
          color: #6b7280;
          line-height: 1.4;
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      </style>
      <script type="text/javascript">
        (function () {
          var siteKey = '${siteKey}';
          var statusText;
          var spinner;
          var retryButton;

          function postMessage(data) {
            if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
              window.ReactNativeWebView.postMessage(JSON.stringify(data));
            }
          }

          function setStatus(message, showSpinner, showRetry) {
            if (statusText) {
              statusText.textContent = message;
            }
            if (spinner) {
              spinner.classList.toggle('hidden', !showSpinner);
            }
            if (retryButton) {
              retryButton.classList.toggle('hidden', !showRetry);
              retryButton.disabled = !showRetry;
            }
          }

          function executeRecaptcha() {
            setStatus('Generando verificación de seguridad...', true, false);

            if (!window.grecaptcha || typeof window.grecaptcha.execute !== 'function') {
              setTimeout(executeRecaptcha, 300);
              return;
            }

            try {
              window.grecaptcha.ready(function () {
                window.grecaptcha
                  .execute(siteKey, { action: 'login_modal' })
                  .then(function (token) {
                    if (typeof token === 'string' && token.length > 0) {
                      postMessage({ type: 'success', token: token });
                    } else {
                      var emptyMessage = 'No se recibió un token válido del servicio reCAPTCHA.';
                      setStatus(emptyMessage, false, true);
                      postMessage({ type: 'error', message: emptyMessage });
                    }
                  })
                  .catch(function (error) {
                    var message =
                      (error && error.message) || 'No se pudo completar la verificación del CAPTCHA.';
                    setStatus(message, false, true);
                    postMessage({ type: 'error', message: message });
                  });
              });
            } catch (error) {
              var message = 'Ocurrió un error inesperado al inicializar reCAPTCHA.';
              setStatus(message, false, true);
              postMessage({ type: 'error', message: message });
            }
          }

          function onRetry() {
            executeRecaptcha();
          }

          document.addEventListener('DOMContentLoaded', function () {
            statusText = document.getElementById('status-text');
            spinner = document.getElementById('status-spinner');
            retryButton = document.getElementById('retry-button');

            if (retryButton) {
              retryButton.addEventListener('click', onRetry);
            }

            executeRecaptcha();
          });
        })();
      </script>
    </head>
    <body>
      <div class="wrapper">
        <div class="status">
          <div id="status-spinner" class="spinner"></div>
          <p id="status-text">Generando verificación de seguridad...</p>
          <button id="retry-button" class="hidden" type="button">Reintentar verificación</button>
        </div>
        <p class="legal">
          Este sitio está protegido por reCAPTCHA y se aplican la <strong>Política de Privacidad</strong> y los
          <strong>Términos del Servicio</strong> de Google.
        </p>
      </div>
    </body>
   </html>`,
    [siteKey],
  );

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