# Análisis de Autenticación - Integración con Keycloak

## Arquitectura General

La aplicación implementa el **flujo OAuth2 Authorization Code** con Keycloak como proveedor de identidad, siguiendo este patrón:

```
Usuario → Frontend (Next.js) → Backend (Express) → Keycloak → Backend → Frontend
```

## Componentes Principales

### 1. Frontend - Cliente de Autenticación
**Ubicación:** `frontend/lib/auth.js:1-187`

**Características:**
- **Patrón Singleton:** Instancia única `authClient` para gestionar el estado de autenticación
- **Almacenamiento:** `access_token` guardado en `sessionStorage`

**Métodos principales:**
- `login()` - Redirige al backend para iniciar el flujo OAuth2
- `logout()` - Revoca tokens y limpia sesión
- `refreshToken()` - Renueva el access token usando refresh token (almacenado en cookie httpOnly)
- `getUser()` - Obtiene información del usuario con recuperación automática si el token expira
- `fetch()` - Wrapper para peticiones autenticadas con retry automático en 401

**Seguridad:**
- ✅ Refresh token NO está expuesto al cliente (en httpOnly cookie)
- ✅ Reintentos automáticos con refresh en errores 401
- ⚠️ Access token en sessionStorage (aceptable, menos seguro que memoria pero persiste en tabs)

### 2. Backend - Rutas OAuth2
**Ubicación:** `backend/routes/auth.js:1-268`

**Endpoints:**

#### `GET /auth/login` (líneas 17-37)
- Genera estado CSRF aleatorio
- Guarda estado en cookie httpOnly
- Redirige a Keycloak authorization endpoint
- Scope: `openid profile email`

#### `GET /auth/callback` (líneas 44-120)
- Valida estado CSRF contra cookie
- Intercambia authorization code por tokens
- Guarda `refresh_token` e `id_token` en cookies httpOnly
- Redirige al frontend con `access_token` como query param

#### `POST /auth/refresh` (líneas 126-189)
- Lee refresh_token de cookie httpOnly
- Solicita nuevo access_token a Keycloak
- Actualiza refresh_token si Keycloak envía uno nuevo
- Limpia cookies si el refresh falla

#### `POST /auth/logout` (líneas 195-230)
- Revoca refresh_token en Keycloak
- Limpia todas las cookies de autenticación
- Manejo de errores resiliente

#### `GET /auth/user` (líneas 236-265)
- Obtiene información del usuario desde Keycloak userinfo endpoint
- Requiere access_token en header Authorization

### 3. Backend - Middleware de Autenticación
**Ubicación:** `backend/middleware/auth.js:1-121`

#### `verifyToken` (líneas 7-66)
- Valida access_token mediante introspección en Keycloak
- Extrae información del usuario (sub, username, email, roles)
- Agrega `req.user` para uso en rutas protegidas

#### `requireRole(role)` (líneas 71-89)
- Verifica que el usuario tenga un rol específico
- Retorna 403 si no tiene el rol requerido

#### `requireAnyRole(roles)` (líneas 94-114)
- Verifica que el usuario tenga al menos uno de los roles especificados

## Flujo de Autenticación Completo

```
1. Usuario hace clic en "Iniciar Sesión"
   ↓
2. Frontend llama a authClient.login()
   ↓
3. Redirige a /auth/login en backend
   ↓
4. Backend genera estado CSRF y redirige a Keycloak
   ↓
5. Usuario se autentica en Keycloak
   ↓
6. Keycloak redirige a /auth/callback con authorization code
   ↓
7. Backend intercambia code por tokens
   ↓
8. Backend guarda refresh_token en cookie httpOnly
   ↓
9. Backend redirige a /auth/success?token=xxx
   ↓
10. Frontend guarda access_token en sessionStorage
    ↓
11. Frontend programa refresh automático
    ↓
12. Redirige a /dashboard
```

## Consideraciones de Seguridad

### Fortalezas
- ✅ Implementa protección CSRF con estado OAuth
- ✅ Refresh token en cookie httpOnly (no accesible por JavaScript)
- ✅ Validación de tokens mediante introspección en Keycloak
- ✅ Cookies con flags `secure` en producción
- ✅ Middleware de autorización basado en roles
- ✅ Helmet.js para headers de seguridad
- ✅ CORS configurado correctamente

### Áreas de Mejora

#### 1. Access token en URL
**Ubicación:** `backend/routes/auth.js:114`
```javascript
res.redirect(`${FRONTEND_URL}/auth/success?token=${access_token}&expires_in=${expires_in}`);
```

**Problema:**
Los tokens en URL pueden quedar en:
- Logs del servidor web
- Historial del navegador
- Referrer headers cuando se navega a sitios externos
- Cache de proxy

**Solución:**
- **Opción A:** Usar POST con formulario auto-submit
- **Opción B:** Guardar token en cookie httpOnly también
- **Opción C:** Usar almacenamiento temporal en backend con ID único

**Prioridad:** ALTA

---

#### 2. Almacenamiento en sessionStorage
**Ubicación:** `frontend/lib/auth.js:14,53`

**Problema:**
- Vulnerable a ataques XSS
- Cualquier script malicioso puede leer el token

**Solución:**
- **Opción A:** Almacenar en memoria (se pierde al refrescar página)
- **Opción B:** Cookie httpOnly (requiere cambios en el backend)
- **Opción C:** Implementar pattern de BFF (Backend for Frontend)

**Prioridad:** MEDIA

---

#### 3. SameSite inconsistente en cookies
**Ubicación:** `backend/routes/auth.js:25,100`

**Problema:**
```javascript
// oauth_state usa 'lax'
sameSite: 'lax'  // línea 25

// refresh_token usa 'strict'
sameSite: 'strict'  // línea 100
```

**Solución:**
Usar `lax` en ambos para compatibilidad con redirecciones OAuth:
```javascript
sameSite: 'lax'
```

**Prioridad:** BAJA

---

#### 4. No hay validación de firma JWT local
**Ubicación:** `backend/middleware/auth.js:24-36`

**Problema:**
Cada petición hace introspección a Keycloak:
```javascript
const response = await axios.post(
  `${keycloakUrl}/realms/${realm}/protocol/openid-connect/token/introspect`,
  // ...
);
```

Esto añade latencia y carga innecesaria.

**Solución:**
1. Obtener clave pública de Keycloak (endpoint jwks)
2. Validar JWT localmente con librería como `jsonwebtoken`
3. Cachear claves públicas
4. Solo hacer introspección si hay duda

**Ejemplo:**
```javascript
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const client = jwksClient({
  jwksUri: `${keycloakUrl}/realms/${realm}/protocol/openid-connect/certs`
});

// Validar localmente
jwt.verify(token, getKey, options, (err, decoded) => {
  // ...
});
```

**Prioridad:** MEDIA

---

#### 5. Falta implementación de PKCE
**Ubicación:** `backend/routes/auth.js:29-34`

**Problema:**
El flujo OAuth2 actual no usa PKCE (Proof Key for Code Exchange):
```javascript
const authUrl = `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/auth?` +
  `client_id=${CLIENT_ID}` +
  `&redirect_uri=${encodeURIComponent(redirectUri)}` +
  `&response_type=code` +
  `&scope=openid profile email` +
  `&state=${state}`;
```

PKCE es recomendado para aplicaciones públicas (SPAs) según RFC 7636.

**Solución:**
1. Generar code_verifier aleatorio
2. Calcular code_challenge (SHA256 del verifier)
3. Incluir en authorization request
4. Enviar code_verifier en token exchange

**Ejemplo:**
```javascript
const crypto = require('crypto');

// Generar code_verifier
const codeVerifier = crypto.randomBytes(32).toString('base64url');

// Calcular code_challenge
const codeChallenge = crypto
  .createHash('sha256')
  .update(codeVerifier)
  .digest('base64url');

// Agregar a URL de autorización
const authUrl = `...&code_challenge=${codeChallenge}&code_challenge_method=S256`;

// En callback, incluir code_verifier en token exchange
```

**Prioridad:** ALTA (para producción)

---

#### 6. Cache de introspección
**Ubicación:** `backend/middleware/auth.js:24-36`

**Problema:**
No hay caché, cada request verifica contra Keycloak.

**Solución:**
Implementar cache con TTL corto:
```javascript
const NodeCache = require('node-cache');
const tokenCache = new NodeCache({ stdTTL: 60 }); // 1 minuto

// En verifyToken
const cacheKey = `token:${token}`;
let tokenData = tokenCache.get(cacheKey);

if (!tokenData) {
  // Introspección a Keycloak
  const response = await axios.post(...);
  tokenData = response.data;
  tokenCache.set(cacheKey, tokenData);
}
```

**Prioridad:** MEDIA

---

#### 7. Rate limiting en endpoints de autenticación
**Ubicación:** `backend/routes/auth.js`

**Problema:**
No hay protección contra ataques de fuerza bruta.

**Solución:**
Implementar rate limiting con `express-rate-limit`:
```javascript
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos
  message: 'Demasiados intentos de autenticación'
});

router.post('/auth/refresh', authLimiter, async (req, res) => {
  // ...
});
```

**Prioridad:** ALTA (para producción)

---

#### 8. Logging de eventos de seguridad
**Ubicación:** Todo el módulo de autenticación

**Problema:**
Logs mínimos de eventos de seguridad.

**Solución:**
Implementar logging estructurado:
- Login exitoso/fallido
- Refresh token utilizado
- Logout
- Intentos con tokens inválidos
- Cambios de roles

**Prioridad:** MEDIA

---

#### 9. Timeout en peticiones a Keycloak
**Ubicación:** `backend/routes/auth.js`, `backend/middleware/auth.js`

**Problema:**
No hay timeouts configurados en peticiones axios.

**Solución:**
```javascript
const response = await axios.post(url, data, {
  timeout: 5000, // 5 segundos
  headers: { ... }
});
```

**Prioridad:** BAJA

---

#### 10. Manejo de revocación de tokens
**Ubicación:** `backend/middleware/auth.js`

**Problema:**
Si un usuario es bloqueado en Keycloak, el token en caché seguiría siendo válido.

**Solución:**
- Implementar webhook de Keycloak para eventos de usuario
- Invalidar caché cuando un usuario es bloqueado
- Alternativamente, reducir TTL de caché

**Prioridad:** BAJA

## Rendimiento

### Problema: Introspección en cada petición
**Impacto:** Latencia adicional de ~50-200ms por request

**Soluciones propuestas:**
1. Validación JWT local (punto 4)
2. Cache de resultados (punto 6)
3. Ambas combinadas

## Resumen

### Estado Actual
La implementación es **funcional y relativamente segura** para desarrollo, con:
- ✅ Separación de responsabilidades (frontend/backend)
- ✅ Refresh token rotation
- ✅ Autorización basada en roles
- ✅ Protección CSRF

### Para Producción - Prioridades

**ALTA:**
1. No pasar tokens por URL (punto 1)
2. Implementar PKCE (punto 5)
3. Rate limiting (punto 7)

**MEDIA:**
4. Validación JWT local (punto 4)
5. Cache de introspección (punto 6)
6. Almacenamiento más seguro del access_token (punto 2)
7. Logging de seguridad (punto 8)

**BAJA:**
8. Unificar SameSite (punto 3)
9. Timeouts en peticiones (punto 9)
10. Manejo de revocación (punto 10)

## Referencias

- [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [PKCE RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Keycloak Documentation](https://www.keycloak.org/documentation)
