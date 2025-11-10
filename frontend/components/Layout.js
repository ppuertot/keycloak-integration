// components/Layout.js
import { useEffect, useState } from 'react';
import Link from 'next/link';
import authClient from '../lib/auth';

export default function Layout({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      if (authClient.isAuthenticated()) {
        const userData = await authClient.getUser();
        setUser(userData);
      }
      setLoading(false);
    };

    loadUser();
  }, []);

  const handleLogout = () => {
    authClient.logout();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-blue-600">
                  🔐 Keycloak Demo
                </h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  href="/"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-blue-600"
                >
                  Inicio
                </Link>
                {user && (
                  <>
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-blue-600"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/profile"
                      className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-blue-600"
                    >
                      Perfil
                    </Link>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center">
              {loading ? (
                <span className="text-sm text-gray-500">Cargando...</span>
              ) : user ? (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-700">
                    Hola, <strong>{user.name || user.preferred_username || user.email}</strong>
                  </span>
                  <button
                    onClick={handleLogout}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium transition"
                  >
                    Cerrar Sesión
                  </button>
                </div>
              ) : (
                <Link
                  href="/auth/signin"
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium transition"
                >
                  Iniciar Sesión
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>

      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 text-sm">
            Demo de integración Keycloak + Express + Next.js (OAuth2 Authorization Code Flow)
          </p>
        </div>
      </footer>
    </div>
  );
}
