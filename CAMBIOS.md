# Resumen de Cambios - OAuth2 Authorization Code Flow

## ✅ Implementación Completada

Se ha refactorizado completamente el proyecto para implementar el **flujo OAuth2 Authorization Code correcto** donde el backend recibe los tokens de Keycloak.

---

## 🔄 Cambios Principales

### Backend (Express)

#### ✨ Nuevos Archivos:
- **`routes/auth.js`** - Rutas OAuth2:
  - `GET /auth/login` - Inicia flujo OAuth2
  - `GET /auth/callback` - Recibe authorization code de Keycloak
  - `POST /auth/refresh` - Renueva access_token
  - `POST /auth/logout` - Cierra sesión
  - `GET /auth/user` - Obtiene info del usuario

#### 📝 Archivos Modificados:
- **`server.js`**:
  - Agregado `cookie-parser` middleware
  - Importadas rutas de autenticación
  - Actualizada documentación de endpoints

- **`package.json`**:
  - ➕ `axios` - Para llamadas HTTP a Keycloak
  - ➕ `cookie-parser` - Para manejar cookies httpOnly

#### ⚙️ Configuración:
- **`setup-keycloak.sh`**:
  - Deshabilitado `directAccessGrantsEnabled` (Resource Owner Password Flow)
  - Habilitado solo `standardFlowEnabled` (Authorization Code Flow)

---

### Frontend (Next.js)

#### ✨ Nuevos Archivos:
- **`lib/auth.js`** - Cliente de autenticación (reemplaza NextAuth):
  - `login()` - Redirige al backend
  - `logout()` - Cierra sesión
  - `getToken()` - Obtiene token actual
  - `getUser()` - Obtiene info del usuario
  - `refreshToken()` - Renueva token expirado
  - `fetch()` - Realiza requests autenticados con refresh automático

- **`pages/auth/success.js`** - Callback después de autenticación exitosa

#### 📝 Archivos Modificados:
- **`pages/_app.js`**:
  - ❌ Eliminado `SessionProvider` de NextAuth
  - Simplificado a componente básico

- **`pages/index.js`**:
  - ❌ Eliminado `useSession` de NextAuth
  - ✅ Usa `authClient.isAuthenticated()`

- **`pages/auth/signin.js`**:
  - ❌ Eliminado `signIn` de NextAuth
  - ✅ Usa `authClient.login()`

- **`pages/dashboard.js`**:
  - ❌ Eliminado `useSession` y axios directo
  - ✅ Usa `authClient.fetch()` con refresh automático

- **`components/Layout.js`**:
  - ❌ Eliminado `useSession` y `signOut`
  - ✅ Usa `authClient.getUser()` y `authClient.logout()`

#### ❌ Archivos Obsoletos (ya no se usan):
- `lib/keycloak.js` - Ya no necesario
- `pages/api/auth/[...nextauth].js` - Reemplazado por backend

---

### Configuración

#### `.env`:
```diff
+ BACKEND_URL=http://localhost:4000
+ FRONTEND_URL=http://localhost:3000
+ NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
- NEXTAUTH_URL=http://localhost:3000
- NEXTAUTH_SECRET=...
```

#### `.gitignore`:
- ✨ Nuevo archivo creado

---

## 🔒 Mejoras de Seguridad

### Antes (con NextAuth):
- ❌ Frontend recibía tokens directamente
- ❌ NextAuth manejaba OAuth en el cliente
- ⚠️ Client secret potencialmente expuesto
- ⚠️ Menos control sobre el flujo

### Ahora (OAuth2 correcto):
- ✅ **Backend recibe tokens de Keycloak**
- ✅ **Client secret seguro en el backend**
- ✅ **Refresh token en httpOnly cookie**
- ✅ **Access token en sessionStorage** (se pierde al cerrar tab)
- ✅ **Credenciales solo en Keycloak** (nunca en tu app)
- ✅ **Authorization Code Flow** (estándar OAuth2)
- ✅ **CSRF protection** con state parameter
- ✅ **Refresh automático** antes de expirar

---

## 📊 Flujo Completo

```
1. Usuario → Click "Login"
2. Frontend → Redirige a backend/auth/login
3. Backend → Redirige a Keycloak
4. Keycloak → Usuario ingresa credenciales
5. Keycloak → Devuelve authorization code al backend
6. Backend → Intercambia code por tokens (usa client_secret)
7. Backend → Guarda refresh_token en httpOnly cookie
8. Backend → Redirige a frontend con access_token
9. Frontend → Guarda access_token en sessionStorage
10. Frontend → Usa token para requests autenticados
```

Ver `FLUJO_OAUTH2.md` para diagrama completo.

---

## 📦 Nuevas Dependencias

### Backend:
```json
{
  "axios": "^1.6.0",
  "cookie-parser": "^1.4.6"
}
```

### Frontend:
- Ninguna nueva (eliminamos next-auth)

---

## 🚀 Cómo Usar

### 1. Instalar dependencias del backend:
```bash
cd backend
npm install
```

### 2. Iniciar Keycloak:
```bash
docker-compose up -d
```

### 3. Configurar Keycloak:
```bash
./setup-keycloak.sh
```

### 4. Iniciar backend:
```bash
cd backend
npm run dev
```

### 5. Iniciar frontend:
```bash
cd frontend
npm run dev
```

### 6. Probar:
- Ir a http://localhost:3000
- Login con `user1` / `password123`
- Probar endpoints del dashboard

---

## 🎯 Endpoints del Backend

### Autenticación:
- `GET /auth/login` - Inicia OAuth2
- `GET /auth/callback` - Callback de Keycloak
- `POST /auth/refresh` - Renueva token
- `POST /auth/logout` - Cierra sesión
- `GET /auth/user` - Info del usuario

### API Protegida:
- `GET /api/protected` - Requiere autenticación
- `GET /api/profile` - Perfil del usuario
- `GET /api/users` - Requiere rol `user`
- `GET /api/admin` - Requiere rol `admin`

---

## 📖 Documentación

- **`README_OAUTH2.md`** - Guía completa de uso
- **`FLUJO_OAUTH2.md`** - Diagrama del flujo
- **Este archivo** - Resumen de cambios

---

## ✨ Ventajas del Nuevo Flujo

1. **Más seguro**: Client secret nunca sale del backend
2. **Estándar OAuth2**: Implementa el flujo correcto
3. **Mejor UX**: Refresh automático transparente
4. **Escalable**: Backend puede servir a múltiples frontends
5. **Auditable**: Todos los tokens pasan por el backend
6. **Cumple GDPR**: Credenciales solo en Keycloak
7. **Protección XSS**: Refresh token inaccesible desde JS

---

## 🔍 Testing

### Probar autenticación:
1. Login con `user1` / `password123`
2. Ver que se redirige al dashboard
3. Verificar que el token funciona

### Probar roles:
1. Como `user1`, llamar `/api/admin` → ❌ 403
2. Logout y login como `admin-user` / `admin123`
3. Llamar `/api/admin` → ✅ 200

### Probar refresh:
1. El token expira en 5 minutos
2. Espera o modifica la expiración en Keycloak
3. Verifica que se renueva automáticamente

---

Desarrollado siguiendo las mejores prácticas de OAuth2 y seguridad web.
