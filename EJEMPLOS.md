# Ejemplos de Uso del API

## 📋 Autenticación

### 1. Iniciar sesión (desde el navegador)

```javascript
// En el frontend (botón de login)
import authClient from '../lib/auth';

authClient.login();
// Redirige automáticamente a Keycloak
```

### 2. Obtener información del usuario

```javascript
const user = await authClient.getUser();
console.log(user);
// {
//   sub: "user-id",
//   preferred_username: "user1",
//   email: "user1@example.com",
//   name: "John Doe",
//   ...
// }
```

### 3. Verificar si está autenticado

```javascript
if (authClient.isAuthenticated()) {
  console.log('Usuario autenticado');
} else {
  console.log('No autenticado');
}
```

### 4. Cerrar sesión

```javascript
authClient.logout();
// Limpia cookies y redirige al home
```

---

## 🔒 Llamadas al API Protegido

### Método 1: Usando authClient.fetch (Recomendado)

```javascript
import authClient from '../lib/auth';

// GET request
const response = await authClient.fetch('http://localhost:4000/api/protected');
const data = await response.json();

// POST request
const response = await authClient.fetch('http://localhost:4000/api/data', {
  method: 'POST',
  body: JSON.stringify({ message: 'Hello' })
});
const data = await response.json();
```

**Ventajas:**
- ✅ Agrega automáticamente el Bearer token
- ✅ Renueva el token si expiró
- ✅ Maneja errores de autenticación

### Método 2: Usando fetch nativo

```javascript
const token = authClient.getToken();

const response = await fetch('http://localhost:4000/api/protected', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
```

---

## 📡 Endpoints Disponibles

### Autenticación

#### 1. Iniciar Login
```bash
# Redirige al usuario a Keycloak
GET http://localhost:4000/auth/login
```

#### 2. Refrescar Token
```bash
POST http://localhost:4000/auth/refresh
# Incluye automáticamente la cookie refresh_token

# Respuesta:
{
  "access_token": "eyJhbGc...",
  "token_type": "Bearer",
  "expires_in": 300
}
```

#### 3. Obtener Usuario
```bash
GET http://localhost:4000/auth/user
Authorization: Bearer YOUR_ACCESS_TOKEN

# Respuesta:
{
  "sub": "user-id",
  "preferred_username": "user1",
  "email": "user1@example.com",
  "name": "John Doe"
}
```

#### 4. Cerrar Sesión
```bash
POST http://localhost:4000/auth/logout
# Incluye automáticamente las cookies

# Respuesta:
{
  "message": "Sesión cerrada exitosamente"
}
```

---

### API Protegida

#### 1. Endpoint Protegido Básico
```bash
GET http://localhost:4000/api/protected
Authorization: Bearer YOUR_ACCESS_TOKEN

# Respuesta:
{
  "message": "Acceso concedido a recurso protegido",
  "user": {
    "sub": "user-id",
    "username": "user1",
    "email": "user1@example.com",
    "roles": ["user"]
  }
}
```

#### 2. Perfil del Usuario
```bash
GET http://localhost:4000/api/profile
Authorization: Bearer YOUR_ACCESS_TOKEN

# Respuesta:
{
  "message": "Perfil del usuario",
  "profile": {
    "id": "user-id",
    "username": "user1",
    "email": "user1@example.com",
    "name": "John Doe",
    "roles": ["user"]
  }
}
```

#### 3. Lista de Usuarios (requiere rol 'user')
```bash
GET http://localhost:4000/api/users
Authorization: Bearer YOUR_ACCESS_TOKEN

# Respuesta exitosa (si tienes rol 'user'):
{
  "message": "Lista de usuarios (requiere rol: user)",
  "users": [
    { "id": 1, "name": "Usuario 1", "email": "user1@example.com" }
  ]
}

# Error (si no tienes el rol):
{
  "error": "No tienes permisos suficientes",
  "requiredRole": "user",
  "userRoles": []
}
```

#### 4. Panel Admin (requiere rol 'admin')
```bash
GET http://localhost:4000/api/admin
Authorization: Bearer YOUR_ACCESS_TOKEN

# Respuesta exitosa:
{
  "message": "Panel de administración",
  "data": {
    "totalUsers": 150,
    "activeUsers": 120,
    "systemStatus": "operational"
  }
}
```

#### 5. POST de Datos
```bash
POST http://localhost:4000/api/data
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "message": "Datos de prueba",
  "value": 123
}

# Respuesta:
{
  "message": "Datos recibidos exitosamente",
  "receivedData": {
    "message": "Datos de prueba",
    "value": 123
  },
  "processedBy": "user1"
}
```

---

## 🧪 Ejemplos con cURL

### Flujo completo con cURL

#### 1. Obtener Authorization Code (manual)
```bash
# Abre en el navegador:
http://localhost:8080/realms/myapp-realm/protocol/openid-connect/auth?client_id=myapp-client&redirect_uri=http://localhost:4000/auth/callback&response_type=code&scope=openid
```

#### 2. Intercambiar Code por Token
```bash
curl -X POST http://localhost:8080/realms/myapp-realm/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=YOUR_AUTH_CODE" \
  -d "redirect_uri=http://localhost:4000/auth/callback" \
  -d "client_id=myapp-client" \
  -d "client_secret=myapp-secret-key-12345"
```

#### 3. Llamar API Protegida
```bash
curl -X GET http://localhost:4000/api/protected \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### 4. Refrescar Token
```bash
curl -X POST http://localhost:8080/realms/myapp-realm/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token" \
  -d "refresh_token=YOUR_REFRESH_TOKEN" \
  -d "client_id=myapp-client" \
  -d "client_secret=myapp-secret-key-12345"
```

---

## 💻 Ejemplo Completo en React Component

```javascript
import { useState, useEffect } from 'react';
import authClient from '../lib/auth';

export default function ProtectedComponent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Verifica autenticación
        if (!authClient.isAuthenticated()) {
          window.location.href = '/auth/signin';
          return;
        }

        // Llamada al API
        const response = await authClient.fetch(
          'http://localhost:4000/api/protected'
        );
        
        if (!response.ok) {
          throw new Error('Error en la petición');
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Datos Protegidos</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
```

---

## 🔄 Manejo de Token Refresh Automático

El cliente de autenticación maneja automáticamente el refresh:

```javascript
// authClient.fetch detecta si el token expiró (401)
// y automáticamente llama a refreshToken()

const response = await authClient.fetch('http://localhost:4000/api/protected');
// Si el token expiró:
// 1. Llama a /auth/refresh
// 2. Obtiene nuevo access_token
// 3. Reintenta la petición original
// Todo esto es transparente para ti
```

---

## 🛡️ Manejo de Errores

```javascript
try {
  const response = await authClient.fetch('http://localhost:4000/api/admin');
  
  if (response.status === 403) {
    console.error('No tienes permisos para este recurso');
  }
  
  const data = await response.json();
} catch (error) {
  if (error.message === 'Sesión expirada') {
    // Redirige al login
    window.location.href = '/auth/signin';
  } else {
    console.error('Error:', error);
  }
}
```

---

## 📱 Uso desde otras plataformas

### Mobile (React Native, Flutter, etc.)

El mismo flujo funciona desde apps móviles:

1. Abre un WebView o navegador del sistema apuntando a:
   ```
   http://localhost:4000/auth/login
   ```

2. Captura la redirección de vuelta con el token

3. Guarda el token de forma segura (Keychain/Keystore)

4. Usa el token en headers de API calls

---

## 🔍 Debug y Testing

### Ver token decodificado

```javascript
const token = authClient.getToken();
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Token payload:', payload);
// {
//   exp: 1234567890,  // Expiración
//   sub: "user-id",
//   preferred_username: "user1",
//   realm_access: { roles: ["user"] }
// }
```

### Verificar expiración

```javascript
const token = authClient.getToken();
const payload = JSON.parse(atob(token.split('.')[1]));
const expiresAt = payload.exp * 1000;
const now = Date.now();

if (now >= expiresAt) {
  console.log('Token expirado');
  await authClient.refreshToken();
}
```

---

Para más información, consulta:
- `README_OAUTH2.md` - Guía completa
- `FLUJO_OAUTH2.md` - Diagrama de flujo
- `CAMBIOS.md` - Resumen de cambios
