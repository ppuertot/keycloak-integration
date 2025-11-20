# Guía de Migración a OAuth2 con Keycloak

## Propósito de este Documento
Esta guía te permite implementar autenticación OAuth2 con Keycloak en proyectos existentes que actualmente usan autenticación manual (login/password local). Está basada en un proyecto de prueba funcional y contiene todos los patrones, código y configuraciones necesarias.

## Resumen Ejecutivo

**Lo que vas a implementar:**
- Autenticación OAuth2 Authorization Code flow
- Keycloak como Identity Provider (IdP)
- Backend maneja el flujo OAuth (no el frontend)
- Validación de tokens mediante introspección (no verificación JWT local)
- Control de acceso basado en roles (RBAC)

**Lo que vas a reemplazar:**
- Sistema de login/password local
- Manejo de sesiones con cookies de sesión tradicionales
- Verificación de contraseñas en tu base de datos
- Gestión manual de roles y permisos

## Arquitectura del Sistema

### Flujo de Autenticación Completo

```
Usuario → Frontend → Backend → Keycloak
  (1)       (2)       (3)        (4)
                      ← ← ← ←
  ← ← ← ← ← ← ← ← ←
  (7)       (6)       (5)
```

**Pasos detallados:**

1. **Usuario hace clic en "Login"** en el frontend
2. **Frontend redirige** a `GET /auth/login` en backend
3. **Backend redirige** a Keycloak con URL de autorización
4. **Usuario autentica** directamente en Keycloak (no en tu app)
5. **Keycloak retorna** código de autorización al backend
6. **Backend intercambia** código por tokens (access + refresh)
7. **Backend redirige** al frontend con access_token

### Componentes Clave

#### Backend (Express.js)
- **Rutas OAuth2**: `/auth/login`, `/auth/callback`, `/auth/logout`, `/auth/refresh`
- **Middleware de autenticación**: `verifyToken` (valida tokens vía introspección)
- **Middleware de autorización**: `requireRole`, `requireAnyRole`
- **Almacenamiento**: Refresh token en httpOnly cookie

#### Frontend (Next.js/React)
- **AuthClient**: Clase para manejar autenticación
- **Almacenamiento**: Access token en sessionStorage
- **Session Management**: NextAuth para manejar sesión (NO autenticación)

#### Keycloak
- **Realm**: Contenedor para tu aplicación
- **Client**: Configuración de tu app (confidential client)
- **Roles**: Definición de permisos
- **Users**: Almacenados en Keycloak (migrar desde tu DB)

## Implementación Paso a Paso

### Paso 1: Configurar Keycloak

**1.1 Desplegar Keycloak con Docker**

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: keycloak
      POSTGRES_USER: keycloak
      POSTGRES_PASSWORD: <TU_PASSWORD_SEGURO>
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - keycloak-network

  keycloak:
    image: quay.io/keycloak/keycloak:26.4.2
    command: start-dev
    environment:
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres:5432/keycloak
      KC_DB_USERNAME: keycloak
      KC_DB_PASSWORD: <TU_PASSWORD_SEGURO>
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: <TU_ADMIN_PASSWORD>
      KC_HOSTNAME_STRICT: false
      KC_HTTP_ENABLED: true
    ports:
      - "8080:8080"
    depends_on:
      - postgres
    networks:
      - keycloak-network

volumes:
  postgres_data:

networks:
  keycloak-network:
```

**1.2 Crear Realm y Client**

Puedes usar la Admin Console (`http://localhost:8080/admin`) o automatizar con script bash:

```bash
#!/bin/bash
# Configuración vía Keycloak Admin REST API

KEYCLOAK_URL="http://localhost:8080"
ADMIN_USER="admin"
ADMIN_PASSWORD="<TU_ADMIN_PASSWORD>"
REALM_NAME="mi-app-realm"
CLIENT_ID="mi-app-client"
CLIENT_SECRET="<GENERA_UN_SECRET_SEGURO>"

# Obtener token de administrador
ADMIN_TOKEN=$(curl -s -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
  -d "username=${ADMIN_USER}" \
  -d "password=${ADMIN_PASSWORD}" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" | jq -r '.access_token')

# Crear Realm
curl -X POST "${KEYCLOAK_URL}/admin/realms" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "realm": "'${REALM_NAME}'",
    "enabled": true,
    "loginWithEmailAllowed": true
  }'

# Crear Cliente
curl -X POST "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/clients" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "'${CLIENT_ID}'",
    "enabled": true,
    "clientAuthenticatorType": "client-secret",
    "secret": "'${CLIENT_SECRET}'",
    "redirectUris": ["http://localhost:3000/*", "http://localhost:4000/*"],
    "webOrigins": ["http://localhost:3000", "http://localhost:4000"],
    "publicClient": false,
    "standardFlowEnabled": true,
    "directAccessGrantsEnabled": false
  }'

# Crear roles
curl -X POST "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/roles" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"name": "user"}'

curl -X POST "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/roles" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"name": "admin"}'
```

### Paso 2: Migrar Backend

**2.1 Instalar Dependencias**

```bash
npm install express cors dotenv axios cookie-parser helmet
```

**2.2 Configurar Variables de Entorno**

```env
# .env
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=mi-app-realm
KEYCLOAK_CLIENT_ID=mi-app-client
KEYCLOAK_CLIENT_SECRET=<TU_CLIENT_SECRET>

BACKEND_URL=http://localhost:4000
FRONTEND_URL=http://localhost:3000

BACKEND_PORT=4000
```

**2.3 Crear Middleware de Autenticación**

```javascript
// middleware/auth.js
const axios = require('axios');

/**
 * Verifica token mediante introspección en Keycloak
 * Agrega req.user con información del usuario
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No se proporcionó token' });
    }

    const token = authHeader.substring(7);
    const keycloakUrl = process.env.KEYCLOAK_URL;
    const realm = process.env.KEYCLOAK_REALM;
    
    // Validar token con Keycloak (introspección)
    const response = await axios.post(
      `${keycloakUrl}/realms/${realm}/protocol/openid-connect/token/introspect`,
      new URLSearchParams({
        token: token,
        client_id: process.env.KEYCLOAK_CLIENT_ID,
        client_secret: process.env.KEYCLOAK_CLIENT_SECRET
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    if (!response.data.active) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    // Adjuntar información del usuario al request
    req.user = {
      sub: response.data.sub,
      username: response.data.username,
      email: response.data.email,
      roles: response.data.realm_access?.roles || [],
      name: response.data.name
    };

    next();
  } catch (error) {
    console.error('Error al verificar token:', error.message);
    return res.status(401).json({ error: 'Error al verificar token' });
  }
};

/**
 * Requiere rol específico
 */
const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user || !req.user.roles.includes(role)) {
      return res.status(403).json({ 
        error: 'Permisos insuficientes',
        requiredRole: role
      });
    }
    next();
  };
};

/**
 * Requiere al menos uno de los roles
 */
const requireAnyRole = (roles) => {
  return (req, res, next) => {
    const hasRole = roles.some(role => req.user.roles.includes(role));
    if (!req.user || !hasRole) {
      return res.status(403).json({ 
        error: 'Permisos insuficientes',
        requiredRoles: roles
      });
    }
    next();
  };
};

module.exports = { verifyToken, requireRole, requireAnyRole };
```

**2.4 Crear Rutas de Autenticación**

```javascript
// routes/auth.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

const KEYCLOAK_URL = process.env.KEYCLOAK_URL;
const REALM = process.env.KEYCLOAK_REALM;
const CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID;
const CLIENT_SECRET = process.env.KEYCLOAK_CLIENT_SECRET;
const BACKEND_URL = process.env.BACKEND_URL;
const FRONTEND_URL = process.env.FRONTEND_URL;

/**
 * GET /auth/login
 * Inicia flujo OAuth2
 */
router.get('/login', (req, res) => {
  const redirectUri = `${BACKEND_URL}/auth/callback`;
  const state = Math.random().toString(36).substring(7);
  
  // CSRF protection
  res.cookie('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600000 // 10 min
  });

  const authUrl = `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/auth?` +
    `client_id=${CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=openid profile email` +
    `&state=${state}`;

  res.redirect(authUrl);
});

/**
 * GET /auth/callback
 * Keycloak redirige aquí con authorization code
 */
router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`${FRONTEND_URL}/auth/error?error=${error}`);
  }

  // Validar state (CSRF)
  const savedState = req.cookies.oauth_state;
  if (!state || state !== savedState) {
    return res.redirect(`${FRONTEND_URL}/auth/error?error=invalid_state`);
  }

  res.clearCookie('oauth_state');

  if (!code) {
    return res.redirect(`${FRONTEND_URL}/auth/error?error=no_code`);
  }

  try {
    // Intercambiar code por tokens
    const tokenUrl = `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`;
    const response = await axios.post(
      tokenUrl,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: `${BACKEND_URL}/auth/callback`,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token, refresh_token } = response.data;

    // Guardar refresh_token en httpOnly cookie (seguro)
    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 días
    });

    // Redirigir a frontend con access_token
    res.redirect(`${FRONTEND_URL}/auth/success?token=${access_token}`);
  } catch (error) {
    console.error('Error en callback:', error.response?.data || error.message);
    res.redirect(`${FRONTEND_URL}/auth/error?error=token_exchange_failed`);
  }
});

/**
 * POST /auth/refresh
 * Renueva access_token usando refresh_token
 */
router.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies.refresh_token;

  if (!refreshToken) {
    return res.status(401).json({ error: 'No refresh token' });
  }

  try {
    const tokenUrl = `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`;
    const response = await axios.post(
      tokenUrl,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token, refresh_token: newRefreshToken } = response.data;

    // Actualizar refresh_token
    res.cookie('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.json({ access_token });
  } catch (error) {
    console.error('Error al renovar token:', error.response?.data);
    res.status(401).json({ error: 'Error al renovar token' });
  }
});

/**
 * POST /auth/logout
 * Cierra sesión en Keycloak
 */
router.post('/logout', async (req, res) => {
  const refreshToken = req.cookies.refresh_token;

  if (refreshToken) {
    try {
      await axios.post(
        `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/logout`,
        new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          refresh_token: refreshToken
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
    } catch (error) {
      console.error('Error al cerrar sesión:', error.message);
    }
  }

  res.clearCookie('refresh_token');
  res.json({ message: 'Sesión cerrada' });
});

/**
 * GET /auth/user
 * Obtiene información del usuario autenticado
 */
router.get('/user', async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'No token' });
  }

  const token = authHeader.substring(7);

  try {
    const response = await axios.get(
      `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/userinfo`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    res.json(response.data);
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
});

module.exports = router;
```

**2.5 Configurar Server Principal**

```javascript
// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { verifyToken, requireRole } = require('./middleware/auth');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.BACKEND_PORT || 4000;

app.use(helmet());
app.use(cors({
  origin: [process.env.FRONTEND_URL],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Rutas públicas
app.use('/auth', authRoutes);

// REEMPLAZA tus rutas protegidas antiguas con esto:
// Antes: app.get('/api/profile', tuMiddlewareAntiguo, handler)
// Ahora:
app.get('/api/profile', verifyToken, (req, res) => {
  res.json({
    user: req.user // Info viene de Keycloak
  });
});

app.get('/api/admin', verifyToken, requireRole('admin'), (req, res) => {
  res.json({ message: 'Solo admins' });
});

app.listen(PORT, () => console.log(`Backend en puerto ${PORT}`));
```

### Paso 3: Migrar Frontend

**3.1 Crear AuthClient**

```javascript
// lib/auth.js
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

class AuthClient {
  constructor() {
    this.token = null;
    this.user = null;
    if (typeof window !== 'undefined') {
      this.token = sessionStorage.getItem('access_token');
    }
  }

  login() {
    window.location.href = `${BACKEND_URL}/auth/login`;
  }

  async logout() {
    try {
      await fetch(`${BACKEND_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Error logout:', error);
    } finally {
      this.token = null;
      this.user = null;
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('access_token');
      }
      window.location.href = '/';
    }
  }

  setToken(token) {
    this.token = token;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('access_token', token);
    }
  }

  getToken() {
    if (!this.token && typeof window !== 'undefined') {
      this.token = sessionStorage.getItem('access_token');
    }
    return this.token;
  }

  isAuthenticated() {
    return !!this.getToken();
  }

  async getUser() {
    if (this.user) return this.user;

    const token = this.getToken();
    if (!token) return null;

    try {
      const response = await fetch(`${BACKEND_URL}/auth/user`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Token inválido');

      this.user = await response.json();
      return this.user;
    } catch (error) {
      console.error('Error obteniendo usuario:', error);
      return null;
    }
  }

  async apiCall(endpoint, options = {}) {
    const token = this.getToken();
    
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 401) {
      // Token expirado, intentar renovar
      const refreshed = await this.refreshToken();
      if (refreshed) {
        // Reintentar request
        return this.apiCall(endpoint, options);
      } else {
        // Refresh falló, logout
        this.logout();
        throw new Error('Sesión expirada');
      }
    }

    return response;
  }

  async refreshToken() {
    try {
      const response = await fetch(`${BACKEND_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) return false;

      const data = await response.json();
      this.setToken(data.access_token);
      return true;
    } catch (error) {
      console.error('Error refresh:', error);
      return false;
    }
  }
}

export const authClient = new AuthClient();
```

**3.2 Página de Callback de Éxito**

```javascript
// pages/auth/success.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { authClient } from '../../lib/auth';

export default function AuthSuccess() {
  const router = useRouter();

  useEffect(() => {
    const { token } = router.query;

    if (token) {
      // Guardar token
      authClient.setToken(token);
      
      // Redirigir a dashboard o home
      router.push('/dashboard');
    }
  }, [router.query]);

  return <div>Autenticando...</div>;
}
```

**3.3 Proteger Páginas**

```javascript
// pages/dashboard.js (ejemplo)
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { authClient } from '../lib/auth';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (!authClient.isAuthenticated()) {
        router.push('/auth/signin');
        return;
      }

      const userData = await authClient.getUser();
      if (!userData) {
        router.push('/auth/signin');
        return;
      }

      setUser(userData);
      setLoading(false);
    };

    checkAuth();
  }, []);

  if (loading) return <div>Cargando...</div>;

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Bienvenido {user.name}</p>
      <button onClick={() => authClient.logout()}>Cerrar Sesión</button>
    </div>
  );
}
```

**3.4 Hacer Llamadas API Protegidas**

```javascript
// Ejemplo de uso
const fetchData = async () => {
  try {
    const response = await authClient.apiCall('/api/profile');
    const data = await response.json();
    console.log(data);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### Paso 4: Migración de Usuarios

**Opción A: Migración Manual**
Exporta usuarios de tu DB y créalos en Keycloak vía Admin API:

```javascript
// Script de migración (ejemplo)
const axios = require('axios');

async function migrateUsers(users, adminToken) {
  for (const user of users) {
    await axios.post(
      `${KEYCLOAK_URL}/admin/realms/${REALM}/users`,
      {
        username: user.username,
        email: user.email,
        enabled: true,
        emailVerified: true,
        credentials: [{
          type: 'password',
          value: 'TEMP_PASSWORD', // Usuarios deben resetear
          temporary: true
        }]
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
  }
}
```

**Opción B: Federación de Identidad**
Configura Keycloak para leer de tu DB existente (User Storage SPI).

## Checklist de Migración

### Backend
- [ ] Instalar dependencias: `axios`, `cookie-parser`
- [ ] Configurar variables de entorno
- [ ] Crear `middleware/auth.js` con `verifyToken`, `requireRole`
- [ ] Crear `routes/auth.js` con rutas OAuth2
- [ ] Reemplazar middleware de autenticación antiguo por `verifyToken`
- [ ] Actualizar rutas protegidas para usar `req.user` (no sesión antigua)
- [ ] Configurar CORS con `credentials: true`
- [ ] Probar endpoints con curl

### Frontend
- [ ] Crear `lib/auth.js` con `AuthClient`
- [ ] Crear página `/auth/success` para callback
- [ ] Actualizar página de login para usar `authClient.login()`
- [ ] Proteger rutas verificando `authClient.isAuthenticated()`
- [ ] Reemplazar llamadas API para usar `authClient.apiCall()`
- [ ] Implementar refresh automático de tokens
- [ ] Añadir botón de logout con `authClient.logout()`

### Keycloak
- [ ] Desplegar Keycloak con Docker
- [ ] Crear Realm para tu aplicación
- [ ] Crear Client (confidential)
- [ ] Definir Roles necesarios
- [ ] Migrar usuarios existentes
- [ ] Asignar roles a usuarios
- [ ] Configurar redirect URIs correctas

### Testing
- [ ] Probar flujo de login completo
- [ ] Verificar redirecciones OAuth
- [ ] Probar refresh de tokens
- [ ] Verificar control de acceso por roles
- [ ] Probar logout
- [ ] Verificar manejo de tokens expirados

## Diferencias Clave vs Autenticación Manual

| Aspecto | Antes (Manual) | Ahora (OAuth2 + Keycloak) |
|---------|---------------|---------------------------|
| **Login** | POST con usuario/password | Redirect a Keycloak |
| **Almacenamiento de passwords** | Tu base de datos | Keycloak |
| **Validación de credenciales** | Tu código backend | Keycloak |
| **Sesión** | Cookie de sesión | Access token (JWT) |
| **Validación por request** | Verificar sesión en DB/memoria | Introspección en Keycloak |
| **Roles** | Tu tabla de roles | Realm roles en Keycloak |
| **Logout** | Borrar sesión local | Invalidar token en Keycloak |

## Patrones Importantes

### No Verificar JWT Localmente
❌ **NO hagas esto:**
```javascript
const jwt = require('jsonwebtoken');
jwt.verify(token, publicKey); // NO
```

✅ **Haz esto:**
```javascript
// Usar introspección
axios.post(`${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token/introspect`, ...)
```

**Razón**: Introspección verifica con Keycloak si el token fue revocado. Verificación local no detecta revocaciones.

### Almacenamiento de Tokens

✅ **Correcto:**
- Refresh token: httpOnly cookie (backend)
- Access token: sessionStorage (frontend)

❌ **Incorrecto:**
- Access token en localStorage (riesgo XSS)
- Refresh token accesible desde JavaScript

### Middleware Chain para Roles

```javascript
// Patrón correcto
app.get('/api/admin', 
  verifyToken,           // 1. Verifica autenticación
  requireRole('admin'),  // 2. Verifica autorización
  handler                // 3. Lógica de negocio
);
```

## Troubleshooting Común

### "Invalid redirect_uri"
- Verifica que `redirect_uri` en backend coincida exactamente con la configurada en Keycloak client

### "CORS error"
- Asegúrate de tener `credentials: true` en CORS
- Frontend debe hacer requests con `credentials: 'include'`

### "Token inválido" inmediatamente después de login
- Verifica que `CLIENT_SECRET` en `.env` coincida con Keycloak
- Revisa logs de Keycloak para errores de validación

### Usuario no tiene roles esperados
- Verifica asignación de roles en Keycloak Admin Console
- Checa que `realm_access.roles` esté incluido en token (scope)

## Recursos Adicionales

**Keycloak Admin API**: https://www.keycloak.org/docs-api/latest/rest-api/
**OAuth2 Spec**: https://oauth.net/2/
**Proyecto de referencia**: Ver código completo en `/backend` y `/frontend` de este repo

## Notas Finales

- Este es un **confidential client** (backend tiene secret)
- **No uses** `directAccessGrantsEnabled: true` en producción (Resource Owner Password flow es inseguro)
- Keycloak maneja **todo** el ciclo de vida de usuarios (registro, reset password, verificación de email)
- En producción, usa HTTPS y configura `KC_PROXY_HEADERS: xforwarded` si usas proxy reverso
