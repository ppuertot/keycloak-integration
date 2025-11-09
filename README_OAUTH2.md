# Integración Keycloak con Express y Next.js

Demo completa de autenticación usando **OAuth2 Authorization Code Flow** con Keycloak, Express.js backend y Next.js frontend.

## 🔐 Flujo de Autenticación

Este proyecto implementa el flujo OAuth2 correcto donde:

1. **Usuario** → Hace clic en "Iniciar sesión"
2. **Frontend** → Redirige a `/auth/login` del backend
3. **Backend** → Redirige a la página de login de Keycloak
4. **Keycloak** → Usuario ingresa credenciales **en Keycloak** (no en tu app)
5. **Keycloak** → Redirige al backend con un `authorization_code`
6. **Backend** → Intercambia el `code` por tokens usando `client_secret`
7. **Backend** → Guarda `refresh_token` en httpOnly cookie
8. **Backend** → Redirige al frontend con el `access_token`
9. **Frontend** → Guarda `access_token` en memoria (sessionStorage)
10. **Frontend** → Usa el token para llamadas autenticadas al backend

## 📋 Requisitos

- Docker y Docker Compose
- Node.js 18+
- jq (para el script de configuración)

## 🚀 Inicio Rápido

### 1. Instalar dependencias del backend

```bash
cd backend
npm install
cd ..
```

### 2. Iniciar Keycloak con Docker

```bash
docker-compose up -d
```

Espera unos 30 segundos a que Keycloak inicie completamente.

### 3. Configurar Keycloak

```bash
chmod +x setup-keycloak.sh
./setup-keycloak.sh
```

Este script crea automáticamente:
- ✅ Realm: `myapp-realm`
- ✅ Cliente: `myapp-client`
- ✅ Roles: `user`, `admin`
- ✅ Usuarios de prueba

### 4. Iniciar el Backend

```bash
cd backend
npm run dev
```

El backend estará en: http://localhost:4000

### 5. Instalar dependencias del Frontend

En otra terminal:

```bash
cd frontend
npm install
```

### 6. Iniciar el Frontend

```bash
npm run dev
```

El frontend estará en: http://localhost:3000

## 👥 Usuarios de Prueba

| Usuario | Contraseña | Rol | Permisos |
|---------|-----------|-----|----------|
| `user1` | `password123` | user | Acceso a endpoints básicos |
| `admin-user` | `admin123` | admin | Acceso completo |

## 🔗 Endpoints del Backend

### Autenticación (No protegidos)

- `GET /auth/login` - Inicia flujo OAuth2
- `GET /auth/callback` - Callback de Keycloak
- `POST /auth/refresh` - Renueva el access_token
- `POST /auth/logout` - Cierra sesión
- `GET /auth/user` - Obtiene info del usuario

### API (Protegidos - requieren Bearer token)

- `GET /api/protected` - Requiere autenticación
- `GET /api/profile` - Perfil del usuario
- `GET /api/users` - Requiere rol `user`
- `GET /api/admin` - Requiere rol `admin`
- `GET /api/dashboard` - Requiere rol `user` o `admin`

## 🛠️ Configuración

### Variables de Entorno

El archivo `.env` en la raíz contiene:

```env
# Keycloak
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=myapp-realm
KEYCLOAK_CLIENT_ID=myapp-client
KEYCLOAK_CLIENT_SECRET=myapp-secret-key-12345

# Backend
BACKEND_PORT=4000
BACKEND_URL=http://localhost:4000

# Frontend
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
NEXT_PUBLIC_KEYCLOAK_URL=http://localhost:8080
NEXT_PUBLIC_KEYCLOAK_REALM=myapp-realm
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=myapp-client
```

## 📚 Estructura del Proyecto

```
.
├── backend/
│   ├── server.js              # Servidor Express principal
│   ├── routes/
│   │   └── auth.js           # Rutas OAuth2
│   ├── middleware/
│   │   └── auth.js           # Middleware de verificación JWT
│   └── package.json
├── frontend/
│   ├── pages/
│   │   ├── index.js          # Página principal
│   │   ├── dashboard.js      # Dashboard protegido
│   │   └── auth/
│   │       ├── signin.js     # Página de login
│   │       ├── success.js    # Callback exitoso
│   │       └── error.js      # Manejo de errores
│   ├── lib/
│   │   └── auth.js           # Cliente de autenticación
│   └── components/
│       └── Layout.js         # Layout con navbar
├── docker-compose.yml         # Keycloak container
├── setup-keycloak.sh         # Script de configuración
└── .env                      # Variables de entorno
```

## 🔒 Seguridad

### Implementaciones de Seguridad:

1. **Authorization Code Flow**: Flujo OAuth2 estándar
2. **Client Secret**: Solo el backend conoce el secret
3. **HttpOnly Cookies**: Refresh token no accesible desde JS
4. **CSRF Protection**: State parameter en OAuth2
5. **Token Refresh Automático**: Renueva antes de expirar
6. **Credenciales en Keycloak**: Usuario nunca envía password a tu app

### Por qué es seguro:

- ❌ El frontend **nunca** ve el `client_secret`
- ❌ El frontend **nunca** ve las credenciales del usuario
- ✅ Keycloak maneja la autenticación
- ✅ Backend valida todos los tokens
- ✅ Refresh token en httpOnly cookie (protege contra XSS)
- ✅ Access token en memoria (se pierde al cerrar tab)

## 🧪 Probar la Integración

1. Abre http://localhost:3000
2. Haz clic en "Iniciar sesión con Keycloak"
3. Serás redirigido a Keycloak
4. Ingresa `user1` / `password123`
5. Serás redirigido de vuelta a tu app
6. Ve al Dashboard y prueba los endpoints

### Probar Refresh Token:

1. El access_token expira en 5 minutos (configurable)
2. El frontend automáticamente lo renueva usando el refresh_token
3. El refresh_token es válido por 30 días

### Probar Roles:

1. Login como `user1`
2. Intenta acceder a `/api/admin` → ❌ Error 403
3. Logout y login como `admin-user`
4. Accede a `/api/admin` → ✅ Éxito

## 🔧 Acceso a Keycloak Admin

- URL: http://localhost:8080/admin
- Usuario: `admin`
- Contraseña: `admin123`

Desde ahí puedes:
- Ver usuarios
- Modificar roles
- Ajustar configuración del cliente
- Ver logs de sesiones

## 📖 Comparación: Antes vs Ahora

### ❌ Implementación Anterior (con NextAuth)

- Frontend recibía tokens directamente
- NextAuth manejaba OAuth2 en el frontend
- Client secret expuesto al navegador
- Menos control sobre el flujo

### ✅ Implementación Nueva (OAuth2 correcto)

- Backend recibe tokens de Keycloak
- Frontend solo recibe access_token
- Client secret seguro en el backend
- Control total del flujo de autenticación
- Refresh token en httpOnly cookie
- Cumple con estándares OAuth2

## 🐛 Troubleshooting

### Keycloak no inicia
```bash
docker-compose down
docker-compose up -d
# Espera 30 segundos
```

### Error "invalid_redirect_uri"
Verifica que en Keycloak → Clients → myapp-client → Valid Redirect URIs esté:
- `http://localhost:4000/*`
- `http://localhost:3000/*`

### Token expirado
El frontend automáticamente intenta renovarlo. Si falla, cierra sesión y vuelve a iniciar.

## 📝 Notas

- El proyecto usa `sessionStorage` para el access_token (se pierde al cerrar tab)
- El refresh_token está en httpOnly cookie (persiste)
- Los tokens expiran según configuración de Keycloak
- El backend valida cada token con Keycloak

## 🎯 Próximos Pasos

Para producción:
1. Usar HTTPS
2. Configurar dominios reales
3. Ajustar tiempos de expiración
4. Implementar rate limiting
5. Agregar logging
6. Configurar CORS apropiadamente

---

Desarrollado como demo de integración Keycloak con OAuth2 Authorization Code Flow.
