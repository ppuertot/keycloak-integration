// routes/auth.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8080';
const REALM = process.env.KEYCLOAK_REALM || 'myapp-realm';
const CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID;
const CLIENT_SECRET = process.env.KEYCLOAK_CLIENT_SECRET;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

/**
 * GET /auth/login
 * Inicia el flujo OAuth2 - redirige al usuario a Keycloak para autenticación
 */
router.get('/login', (req, res) => {
  const redirectUri = `${BACKEND_URL}/auth/callback`;
  const state = Math.random().toString(36).substring(7); // Estado para CSRF
  
  // Guardar state en cookie para validar después
  res.cookie('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600000 // 10 minutos
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
 * Keycloak redirige aquí después de la autenticación exitosa
 * Intercambia el authorization code por tokens
 */
router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;

  // Verificar si hubo error en Keycloak
  if (error) {
    console.error('Error de Keycloak:', error);
    return res.redirect(`${FRONTEND_URL}/auth/error?error=${error}`);
  }

  // Validar state para prevenir CSRF
  const savedState = req.cookies.oauth_state;
  if (!state || state !== savedState) {
    console.error('Estado OAuth inválido');
    return res.redirect(`${FRONTEND_URL}/auth/error?error=invalid_state`);
  }

  // Limpiar cookie de state
  res.clearCookie('oauth_state');

  if (!code) {
    return res.redirect(`${FRONTEND_URL}/auth/error?error=no_code`);
  }

  try {
    // Intercambiar authorization code por tokens
    const tokenUrl = `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`;
    const redirectUri = `${BACKEND_URL}/auth/callback`;

    const response = await axios.post(
      tokenUrl,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const {
      access_token,
      refresh_token,
      id_token,
      expires_in,
      token_type
    } = response.data;

    // Guardar refresh_token en httpOnly cookie (seguro)
    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 días
    });

    // Guardar id_token para logout
    res.cookie('id_token', id_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: expires_in * 1000
    });

    // Redirigir al frontend con el access_token como query param
    // El frontend lo guardará en memoria o sessionStorage
    res.redirect(`${FRONTEND_URL}/auth/success?token=${access_token}&expires_in=${expires_in}`);

  } catch (error) {
    console.error('Error al intercambiar código por token:', error.response?.data || error.message);
    res.redirect(`${FRONTEND_URL}/auth/error?error=token_exchange_failed`);
  }
});

/**
 * POST /auth/refresh
 * Renueva el access_token usando el refresh_token almacenado en la cookie
 */
router.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies.refresh_token;

  if (!refreshToken) {
    return res.status(401).json({
      error: 'No hay refresh token disponible',
      code: 'NO_REFRESH_TOKEN'
    });
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
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const {
      access_token,
      refresh_token: new_refresh_token,
      expires_in
    } = response.data;

    // Actualizar refresh_token si Keycloak devolvió uno nuevo
    if (new_refresh_token) {
      res.cookie('refresh_token', new_refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000
      });
    }

    res.json({
      access_token,
      token_type: 'Bearer',
      expires_in
    });

  } catch (error) {
    console.error('Error al refrescar token:', error.response?.data || error.message);
    
    // Si el refresh_token es inválido, limpiar cookies
    res.clearCookie('refresh_token');
    res.clearCookie('id_token');

    res.status(401).json({
      error: 'No se pudo refrescar el token',
      code: 'REFRESH_FAILED',
      details: error.response?.data?.error_description
    });
  }
});

/**
 * POST /auth/logout
 * Cierra sesión en Keycloak y limpia las cookies
 */
router.post('/logout', async (req, res) => {
  const refreshToken = req.cookies.refresh_token;
  const idToken = req.cookies.id_token;

  try {
    if (refreshToken) {
      // Revocar el refresh token en Keycloak
      const logoutUrl = `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/logout`;

      await axios.post(
        logoutUrl,
        new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          refresh_token: refreshToken
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
    }
  } catch (error) {
    console.error('Error al hacer logout en Keycloak:', error.response?.data || error.message);
    // Continuar de todos modos para limpiar cookies locales
  }

  // Limpiar todas las cookies de autenticación
  res.clearCookie('refresh_token');
  res.clearCookie('id_token');

  res.json({
    message: 'Sesión cerrada exitosamente'
  });
});

/**
 * GET /auth/user
 * Obtiene información del usuario actual usando el access_token
 */
router.get('/user', async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'No se proporcionó token de autenticación'
    });
  }

  const accessToken = authHeader.substring(7);

  try {
    // Obtener información del usuario desde Keycloak
    const userInfoUrl = `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/userinfo`;

    const response = await axios.get(userInfoUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    res.json(response.data);

  } catch (error) {
    console.error('Error al obtener info del usuario:', error.response?.data || error.message);
    res.status(401).json({
      error: 'Token inválido o expirado'
    });
  }
});

module.exports = router;
