// lib/auth.js
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

/**
 * Cliente de autenticación para interactuar con el backend
 */
class AuthClient {
  constructor() {
    this.token = null;
    this.user = null;
    
    // Intentar cargar el token del sessionStorage al iniciar
    if (typeof window !== 'undefined') {
      this.token = sessionStorage.getItem('access_token');
    }
  }

  /**
   * Inicia el flujo de login - redirige al backend que a su vez redirige a Keycloak
   */
  login() {
    window.location.href = `${BACKEND_URL}/auth/login`;
  }

  /**
   * Cierra sesión
   */
  async logout() {
    try {
      await fetch(`${BACKEND_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include' // Incluir cookies
      });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      // Limpiar estado local
      this.token = null;
      this.user = null;
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('access_token');
      }
      window.location.href = '/';
    }
  }

  /**
   * Guarda el token recibido
   */
  setToken(token) {
    this.token = token;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('access_token', token);
    }
  }

  /**
   * Obtiene el token actual
   */
  getToken() {
    if (!this.token && typeof window !== 'undefined') {
      this.token = sessionStorage.getItem('access_token');
    }
    return this.token;
  }

  /**
   * Verifica si hay una sesión activa
   */
  isAuthenticated() {
    return !!this.getToken();
  }

  /**
   * Obtiene información del usuario actual
   */
  async getUser() {
    if (this.user) {
      return this.user;
    }

    const token = this.getToken();
    if (!token) {
      return null;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/auth/user`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Token inválido');
      }

      this.user = await response.json();
      return this.user;
    } catch (error) {
      console.error('Error al obtener usuario:', error);
      // Si el token es inválido, intentar refrescar
      const refreshed = await this.refreshToken();
      if (refreshed) {
        return this.getUser();
      }
      return null;
    }
  }

  /**
   * Refresca el access token usando el refresh token
   */
  async refreshToken() {
    try {
      const response = await fetch(`${BACKEND_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include' // Incluir cookies (refresh_token)
      });

      if (!response.ok) {
        throw new Error('No se pudo refrescar el token');
      }

      const data = await response.json();
      this.setToken(data.access_token);
      return true;
    } catch (error) {
      console.error('Error al refrescar token:', error);
      // Si falla el refresh, limpiar sesión
      this.token = null;
      this.user = null;
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('access_token');
      }
      return false;
    }
  }

  /**
   * Realiza una petición autenticada al backend
   */
  async fetch(url, options = {}) {
    const token = this.getToken();
    
    if (!token) {
      throw new Error('No hay token disponible');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    // Si obtenemos 401, intentar refrescar el token
    if (response.status === 401) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        // Reintentar la petición con el nuevo token
        const newToken = this.getToken();
        return fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${newToken}`,
            'Content-Type': 'application/json'
          }
        });
      } else {
        // Si no se pudo refrescar, redirigir al login
        window.location.href = '/';
        throw new Error('Sesión expirada');
      }
    }

    return response;
  }
}

// Exportar instancia única
const authClient = new AuthClient();
export default authClient;
