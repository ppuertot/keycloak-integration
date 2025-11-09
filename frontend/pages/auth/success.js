// pages/auth/success.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import authClient from '../../lib/auth';

export default function AuthSuccess() {
  const router = useRouter();

  useEffect(() => {
    const { token, expires_in } = router.query;

    if (token) {
      // Guardar el token
      authClient.setToken(token);
      
      // Configurar refresh automático antes de que expire
      if (expires_in) {
        const expiresInMs = parseInt(expires_in) * 1000;
        const refreshTime = expiresInMs - 60000; // Refrescar 1 minuto antes
        
        setTimeout(() => {
          authClient.refreshToken();
        }, refreshTime);
      }

      // Redirigir al dashboard
      router.push('/dashboard');
    } else {
      // Si no hay token, algo salió mal
      router.push('/auth/error?error=no_token');
    }
  }, [router.query]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-700">Autenticando...</p>
        </div>
      </div>
    </div>
  );
}
