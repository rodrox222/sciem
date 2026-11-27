# SCIEM — Frontend Web y App Móvil (`gui/`)

Interfaz web y móvil del **Sistema de Control de Ingreso de Exámenes Masivos (SCI)**, construida con **React 19 + TypeScript + Vite 8**, **Tailwind CSS v4 + shadcn/ui** y empaquetada para Android mediante **Capacitor**.

---

## 1. Requisitos previos

### Para desarrollo y build web
* **Node.js** (LTS recomendado: v20 o v22) y **npm**
* Navegador moderno

### Adicional para compilar la APK Android
* **Java JDK 17 o 21** (con `JAVA_HOME` configurado)
* **Android Studio** (o Android Command-line Tools) con **Android SDK** instalado:
  * `compileSdkVersion` / `targetSdkVersion`: **36** (Android 16)
  * `minSdkVersion`: **24** (Android 7.0+)
  * Android SDK Platform-Tools y Build-Tools
* Variable de entorno **`ANDROID_HOME`** apuntando a la ruta del SDK de Android (en Windows suele ser `C:\Users\<Usuario>\AppData\Local\Android\Sdk`).

---

## 2. Configuración de `.env` (Ejemplo)

Crea un archivo `.env` dentro de `gui/` (no subir `.env` al repositorio).

### Ejemplo para desarrollo web local
```env
VITE_API_URL=http://localhost:8200/api
```

### Ejemplo para producción / compilar la APK Android
```env
VITE_API_URL=https://tu-backend.onrender.com/api
```

> **Importante:**
> * Vite incrusta el valor de `VITE_API_URL` **en el momento de ejecutar `npm run build`**.
> * Si vas a compilar la APK para probarla en un teléfono físico contra tu backend local, **no uses `localhost`**; usa la IP de tu PC en la red local (por ejemplo `http://192.168.1.50:8200/api`) o la URL pública del backend en producción.
> * Si `VITE_API_URL` se deja vacío en web, el cliente intenta resolver las peticiones de forma relativa (`/api`).

---

## 3. Comandos de desarrollo y build web

Desde la carpeta `gui/`:

```bash
# Instalar dependencias
npm install

# Levantar servidor de desarrollo
npm run dev

# Verificar linter
npm run lint

# Generar build de producción (genera gui/dist/)
npm run build
```

> **Nota sobre `public/apk/sci.apk`:**
> `npm run build` únicamente compila el código web hacia `gui/dist/`. Todo archivo colocado en `gui/public/` (incluido `public/apk/sci.apk`) se copia automáticamente a `gui/dist/apk/sci.apk` como archivo estático, pero **no** recompila la APK.

---

## 4. Cómo compilar y actualizar `sci.apk` (Android)

La app Android usa **Capacitor** (`appId`: `com.umss.sci`, `appName`: `SCI`, `webDir`: `dist` en `capacitor.config.ts`).

### Paso a paso (desde `gui/`)

1. **Asegura el `.env` correcto** para el destino de la APK (`VITE_API_URL` apuntando al servidor que usará el celular).

2. **Compila el frontend web:**
   ```bash
   npm run build
   ```

3. **Sincroniza el build (`dist/`) con el proyecto Android:**
   ```bash
   npx cap sync android
   ```

4. **Genera la APK:**
   * **Opción A — Por terminal (Gradle):**
     * En Windows (PowerShell):
       ```powershell
       cd android
       .\gradlew assembleDebug
       ```
     * En Linux / macOS:
       ```bash
       cd android
       ./gradlew assembleDebug
       ```
     La APK se generará en:
     `gui/android/app/build/outputs/apk/debug/app-debug.apk`

   * **Opción B — Desde Android Studio (recomendada para Release firmado):**
     ```bash
     npx cap open android
     ```
     Luego en Android Studio: **Build > Build Bundle(s) / APK(s) > Build APK(s)** (o **Generate Signed Bundle / APK** para versión de producción).

5. **Publicar la APK para descarga desde la web (opcional):**
   Si deseas actualizar el archivo que se descarga desde la web (`/apk/sci.apk`):
   * Copia el `.apk` generado reemplazando `gui/public/apk/sci.apk`.
   * Vuelve a ejecutar `npm run build` (para que `dist/apk/sci.apk` quede actualizado) antes de desplegar.
