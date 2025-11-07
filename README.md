# Integración Keycloak + Express + Next.js

Esta es una implementación completa de autenticación con Keycloak, integrando un backend Express.js y un frontend Next.js.

## 📋 Requisitos Previos

- Docker y Docker Compose instalados
- Node.js 18+ instalado
- jq (para el script de configuración): `sudo apt-get install jq` o `brew install jq`

## 🚀 Instalación y Configuración

### Paso 1: Iniciar Keycloak con Docker

```bash
# Iniciar Keycloak y PostgreSQL
docker-compose up -d

# Esperar a que Keycloak esté listo (30-60 segundos)
# Verificar que esté corriendo
docker ps
```

Keycloak estará disponible en: http://localhost:8080

### Paso 2: Configurar Keycloak

```bash
# Dar permisos de ejecución al script
chmod +x setup-keycloak.sh

# Ejecutar el script de configuración
./setup-keycloak.sh
```

Este script creará automáticamente:
- Un realm llamado `myapp-realm`
- Un cliente llamado `myapp-client`
- Roles: `user` y `admin`
- Usuarios de prueba:
  - **user1** / password123 (rol: user)
  - **admin-user** / admin123 (rol: admin)

### Paso 3: Instalar y Ejecutar el Backend

```bash
cd backend

# Instalar dependencias
npm install

# Iniciar el servidor
npm run dev
```

El backend estará disponible en: http://localhost:4000

### Paso 4: Instalar y Ejecutar el Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Iniciar el servidor de desarrollo
npm run dev
```

El frontend estará disponible en: http://localhost:3000

## 🔐 Información de Acceso

### Keycloak Admin Console
- URL: http://localhost:8080/admin
- Usuario: admin
- Contraseña: admin123
- Realm: myapp-realm

### Usuarios de Prueba
1. **Usuario Regular**
   - Username: user1
   - Password: password123
   - Rol: user

2. **Administrador**
   - Username: admin-user
   - Password: admin123
   - Rol: admin

## 📚 Arquitectura

### Backend (Express.js)
El backend expone los siguientes endpoints:

**Públicos:**
- `GET /` - Información de la API
- `GET /api/health` - Estado del servidor
- `GET /api/public` - Endpoint público de prueba

**Protegidos (requieren autenticación):**
- `GET /api/protected` - Endpoint protegido básico
- `GET /api/profile` - Perfil del usuario autenticado
- `GET /api/users` - Lista de usuarios (requiere rol: user)
- `GET /api/admin` - Panel de administración (requiere rol: admin)
- `GET /api/dashboard` - Dashboard (requiere rol: user o admin)
- `POST /api/data` - Enviar datos (requiere autenticación)

### Frontend (Next.js)
Páginas disponibles:
- `/` - Página principal
- `/auth/signin` - Página de inicio de sesión
- `/dashboard` - Dashboard (protegida)
- `/profile` - Perfil del usuario (protegida)

## 🧪 Probar la Integración

1. **Accede al frontend**: http://localhost:3000
2. **Haz clic en "Iniciar Sesión"**
3. **Serás redirigido a Keycloak**
4. **Ingresa las credenciales** (user1/password123 o admin-user/admin123)
5. **Una vez autenticado**, regresarás al frontend con tu sesión activa
6. **En el Dashboard**, prueba los diferentes endpoints del backend

### Probar con cURL

```bash
# 1. Obtener token de acceso
TOKEN=$(curl -s -X POST "http://localhost:8080/realms/myapp-realm/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=user1" \
  -d "password=password123" \
  -d "grant_type=password" \
  -d "client_id=myapp-client" \
  -d "client_secret=myapp-secret-key-12345" | jq -r '.access_token')

# 2. Usar el token para acceder a endpoints protegidos
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/protected

# 3. Intentar acceder al endpoint de admin (fallará con user1)
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/admin
```

## 🔧 Configuración

### Variables de Entorno

El archivo `.env` contiene toda la configuración necesaria:

```env
# Keycloak
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=myapp-realm
KEYCLOAK_CLIENT_ID=myapp-client
KEYCLOAK_CLIENT_SECRET=myapp-secret-key-12345

# Backend
BACKEND_PORT=4000

# Frontend
NEXT_PUBLIC_KEYCLOAK_URL=http://localhost:8080
NEXT_PUBLIC_KEYCLOAK_REALM=myapp-realm
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=myapp-client
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-key-change-in-production
```

## 📖 Conceptos Clave

### JWT (JSON Web Token)
Keycloak emite tokens JWT que contienen:
- Información del usuario (sub, email, name)
- Roles asignados
- Fecha de expiración
- Firma digital para verificar autenticidad

### Flujo de Autenticación (OpenID Connect)
1. Usuario hace clic en "Iniciar Sesión"
2. Frontend redirige a Keycloak
3. Usuario ingresa credenciales en Keycloak
4. Keycloak valida y emite tokens
5. Usuario es redirigido de vuelta con tokens
6. Frontend usa tokens para llamadas al backend
7. Backend valida tokens con Keycloak

### Roles y Permisos
- Los roles se definen en Keycloak
- Se asignan a usuarios
- El backend verifica roles en el token JWT
- Se pueden requerir roles específicos por endpoint

## 🛠️ Desarrollo

### Agregar Nuevos Endpoints Protegidos

```javascript
// En backend/server.js
app.get('/api/mi-endpoint', verifyToken, requireRole('mi-rol'), (req, res) => {
  res.json({
    message: 'Mi endpoint protegido',
    user: req.user
  });
});
```

### Agregar Nuevas Páginas Protegidas

```javascript
// En frontend/pages/mi-pagina.js
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function MiPagina() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Tu contenido aquí
}
```

## 🔍 Troubleshooting

### Keycloak no inicia
```bash
# Ver logs
docker-compose logs keycloak

# Reiniciar servicios
docker-compose restart
```

### Error de CORS en el backend
Verifica que el origen del frontend esté permitido en `backend/server.js`:
```javascript
cors({
  origin: ['http://localhost:3000'],
  credentials: true
})
```

### Token inválido o expirado
- Los tokens JWT tienen una duración limitada (generalmente 5-15 minutos)
- NextAuth maneja la renovación automática de tokens
- Si el problema persiste, cierra sesión y vuelve a iniciar

### No puedo acceder a endpoints de admin
- Verifica que estés usando el usuario correcto (admin-user)
- Comprueba en el perfil que tengas el rol 'admin'
- Los roles se incluyen en el token JWT

## 📦 Estructura del Proyecto

```
.
├── docker-compose.yml          # Configuración de Keycloak y PostgreSQL
├── setup-keycloak.sh          # Script de configuración automática
├── .env                       # Variables de entorno
├── backend/
│   ├── package.json
│   ├── server.js             # Servidor Express principal
│   ├── keycloak-config.js    # Configuración de Keycloak
│   └── middleware/
│       └── auth.js           # Middleware de autenticación JWT
└── frontend/
    ├── package.json
    ├── next.config.js
    ├── tailwind.config.js
    ├── lib/
    │   └── keycloak.js       # Configuración de Keycloak para NextAuth
    ├── components/
    │   └── Layout.js         # Layout principal
    ├── pages/
    │   ├── _app.js          # Configuración de SessionProvider
    │   ├── index.js         # Página principal
    │   ├── dashboard.js     # Dashboard (protegida)
    │   ├── profile.js       # Perfil (protegida)
    │   ├── auth/
    │   │   ├── signin.js   # Página de login
    │   │   └── error.js    # Página de error
    │   └── api/
    │       └── auth/
    │           └── [...nextauth].js  # Configuración de NextAuth
    └── styles/
        └── globals.css      # Estilos globales
```

## 🌐 URLs Importantes

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- Keycloak Admin: http://localhost:8080/admin
- Keycloak Realm: http://localhost:8080/realms/myapp-realm
- OpenID Configuration: http://localhost:8080/realms/myapp-realm/.well-known/openid-configuration

## 🚨 Notas de Seguridad

⚠️ **Esta configuración es para desarrollo solamente. Para producción:**

1. Cambia todos los passwords y secrets
2. Usa HTTPS en todos los servicios
3. Configura correctamente los redirect URIs
4. Habilita verificación de email
5. Configura rate limiting
6. Usa variables de entorno seguras
7. Implementa logging y monitoreo
8. Configura backups de la base de datos

## 📝 Licencia

MIT
