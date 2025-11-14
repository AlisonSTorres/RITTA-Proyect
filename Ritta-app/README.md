# Ritta App project

## Prerequisitos
- Node.js (v14 en adelante)
- Expo Go (para Android o ios)
- AndroidStudio(para Android)
- Postgrest (v18)

## Preparación
1. Clonar repositorio:
```bash
git clone "LINK"
```

2. Navegación en el directorio:
```bash
cd Ritta-mobile
```

3. Instalación de dependencias:
```bash
# Instalar dependencias front
cd apps/mobile
npm install
npm install -g expo-cli

# Instalar dependencias back
cd services/backend
npm install
npm install axios
.env agregar para entorno local #(Formato en este Link: )

# Configuración Postgresql
en ritta-mobile/database/dumps encontrara la estructura y datos para hacer test
1. crear nueva DB en postgre utilizando "estructura_supabase.sql" 
2. Cargar datos utilizando "datos_supabase.sql"
en caso de que fallen los archivos puede encontrar los archivos en el siguiente Link:
INSERTAR LINK AQUÍ

```

4. Correr la app
```bash
1. Iniciar back
cd services/backend
npm run dev

2. Iniciar Front
cd apps/mobile
npm start
IMPORTANTE: Si hay un error de conexión se debe a las ip, se configuró con las IP predeterminadas de expo, estas podrían cambiar en ciertos dispositivos
se debe verificar en el archivo Ritta-app/app/mobile/services/api.ts las rutas especificadas y cambiar según corresponda.

#Información 
1. Presionar "W" Para versión WEB
2. Presionar "A" Para versión Android utilizando AndroidStudio en windows #(se debe cambiar la IP como se señala en el archivo api.ts)
3. Presionar "A" Para versión IOS utilizando Xcode en MAC #(se debe cambiar la IP como se señala en el archivo api.ts)
4. Escanear el código QR desde la app EXPO GO #(descargar desde la playstore o appstore)

#Usuarios activos (credenciales)
- Gmail para verificación de 2 pasos:
Email: rittatest@gmail.com
contraseña: Test2025
#Para todas las cuentas de prueba se ha utilizado el mismo correo de verificación
#se sugiere ingresar al correo desde navegador, si se hace desde dispositivo movil, no activar información desde su dispositivo (como número de teléfono u otro)

1. Administrador:
    Rut:
    Password:
2. Apoderado
    Rut:
    Password:
3. Inspector
    Rut:
    Password:
4. Aula
    Rut:
    Password:
5. Super-Admin
    Rut:
    Password:
```