// server.js
require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { verifyToken, requireRole, requireAnyRole } = require('./middleware/auth');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.BACKEND_PORT || 4000;

// Middlewares
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ==========================================
// RUTAS PÚBLICAS
// ==========================================

// Rutas de autenticación OAuth2
app.use('/auth', authRoutes);

app.get('/', (req, res) => {
  res.json({
    message: 'API Backend con Keycloak',
    version: '1.0.0',
    endpoints: {
      auth: [
        'GET /auth/login',
        'GET /auth/callback',
        'POST /auth/refresh',
        'POST /auth/logout',
        'GET /auth/user'
      ],
      public: [
        'GET /',
        'GET /api/health',
        'GET /api/public'
      ],
      protected: [
        'GET /api/protected',
        'GET /api/profile',
        'GET /api/users (requiere rol: user)',
        'GET /api/admin (requiere rol: admin)'
      ]
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/public', (req, res) => {
  res.json({
    message: 'Este es un endpoint público, no requiere autenticación',
    data: {
      timestamp: new Date().toISOString(),
      info: 'Cualquiera puede acceder a este endpoint'
    }
  });
});

// ==========================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ==========================================

// Endpoint protegido básico
app.get('/api/protected', verifyToken, (req, res) => {
  res.json({
    message: 'Acceso concedido a recurso protegido',
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

// Perfil del usuario autenticado
app.get('/api/profile', verifyToken, (req, res) => {
  res.json({
    message: 'Perfil del usuario',
    profile: {
      id: req.user.sub,
      username: req.user.username,
      email: req.user.email,
      name: req.user.name,
      roles: req.user.roles
    }
  });
});

// Endpoint solo para usuarios con rol "user"
app.get('/api/users', verifyToken, requireRole('user'), (req, res) => {
  res.json({
    message: 'Lista de usuarios (requiere rol: user)',
    users: [
      { id: 1, name: 'Usuario 1', email: 'user1@example.com' },
      { id: 2, name: 'Usuario 2', email: 'user2@example.com' }
    ],
    accessedBy: req.user.username
  });
});

// Endpoint solo para administradores
app.get('/api/admin', verifyToken, requireRole('admin'), (req, res) => {
  res.json({
    message: 'Panel de administración (requiere rol: admin)',
    data: {
      totalUsers: 150,
      activeUsers: 120,
      systemStatus: 'operational'
    },
    accessedBy: req.user.username
  });
});

// Endpoint con múltiples roles permitidos
app.get('/api/dashboard', verifyToken, requireAnyRole(['user', 'admin']), (req, res) => {
  res.json({
    message: 'Dashboard (requiere rol: user o admin)',
    data: {
      userRole: req.user.roles,
      dashboardData: {
        notifications: 5,
        messages: 12,
        tasks: 8
      }
    }
  });
});

// Endpoint POST protegido
app.post('/api/data', verifyToken, (req, res) => {
  res.json({
    message: 'Datos recibidos exitosamente',
    receivedData: req.body,
    processedBy: req.user.username,
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// MANEJO DE ERRORES
// ==========================================

// 404 - Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint no encontrado',
    path: req.path,
    method: req.method
  });
});

// Error handler global
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ==========================================
// INICIAR SERVIDOR
// ==========================================

app.listen(PORT, () => {
  console.log('==========================================');
  console.log(`🚀 Servidor Express iniciado`);
  console.log(`📡 Puerto: ${PORT}`);
  console.log(`🌍 URL: http://localhost:${PORT}`);
  console.log(`🔐 Keycloak URL: ${process.env.KEYCLOAK_URL}`);
  console.log(`👑 Realm: ${process.env.KEYCLOAK_REALM}`);
  console.log(`🔑 Client ID: ${process.env.KEYCLOAK_CLIENT_ID}`);
  console.log('==========================================');
});

module.exports = app;
