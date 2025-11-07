// middleware/auth.js
const axios = require('axios');

/**
 * Middleware para verificar el token JWT de Keycloak
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'No se proporcionó token de autenticación' 
      });
    }

    const token = authHeader.substring(7);
    
    // Verificar el token con Keycloak
    const keycloakUrl = process.env.KEYCLOAK_URL || 'http://localhost:8080';
    const realm = process.env.KEYCLOAK_REALM || 'myapp-realm';
    
    try {
      const response = await axios.post(
        `${keycloakUrl}/realms/${realm}/protocol/openid-connect/token/introspect`,
        new URLSearchParams({
          token: token,
          client_id: process.env.KEYCLOAK_CLIENT_ID,
          client_secret: process.env.KEYCLOAK_CLIENT_SECRET
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      if (!response.data.active) {
        return res.status(401).json({ 
          error: 'Token inválido o expirado' 
        });
      }

      // Agregar información del usuario al request
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
      return res.status(401).json({ 
        error: 'Error al verificar el token' 
      });
    }
  } catch (error) {
    console.error('Error en middleware de autenticación:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor' 
    });
  }
};

/**
 * Middleware para verificar roles específicos
 */
const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'No autenticado' 
      });
    }

    if (!req.user.roles.includes(role)) {
      return res.status(403).json({ 
        error: 'No tienes permisos suficientes',
        requiredRole: role,
        userRoles: req.user.roles
      });
    }

    next();
  };
};

/**
 * Middleware para verificar que el usuario tenga al menos uno de los roles especificados
 */
const requireAnyRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'No autenticado' 
      });
    }

    const hasRole = roles.some(role => req.user.roles.includes(role));
    
    if (!hasRole) {
      return res.status(403).json({ 
        error: 'No tienes permisos suficientes',
        requiredRoles: roles,
        userRoles: req.user.roles
      });
    }

    next();
  };
};

module.exports = {
  verifyToken,
  requireRole,
  requireAnyRole
};
