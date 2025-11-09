// pages/auth/signin.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import authClient from '../../lib/auth';

export default function SignIn() {
  const router = useRouter();
  const { error } = router.query;

  useEffect(() => {
    // Si ya está autenticado, redirigir al dashboard
    if (authClient.isAuthenticated()) {
      router.push('/dashboard');
    }
  }, []);

  const handleSignIn = () => {
    authClient.login();
  };

  return (
    <Layout>
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Iniciar Sesión
            </h2>
            <p className="text-gray-600">
              Usa tu cuenta de Keycloak para continuar
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">
                {error === 'OAuthAccountNotLinked'
                  ? 'Esta cuenta ya está vinculada con otro proveedor.'
                  : 'Ocurrió un error durante el inicio de sesión. Por favor, intenta de nuevo.'}
              </p>
            </div>
          )}

          <button
            onClick={handleSignIn}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span>Continuar con Keycloak</span>
          </button>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Serás redirigido a Keycloak para autenticarte de forma segura
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
