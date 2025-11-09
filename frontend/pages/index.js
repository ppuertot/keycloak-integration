// pages/index.js
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Link from 'next/link';
import authClient from '../lib/auth';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setIsAuthenticated(authClient.isAuthenticated());
  }, []);

  return (
    <Layout>
      <div className="px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Bienvenido a la Demo de Keycloak
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Esta aplicación demuestra la integración de Keycloak con Express.js y Next.js usando OAuth2 Authorization Code Flow
          </p>
        </div>

        {!isAuthenticated ? (
          <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-semibold mb-6 text-center">
              🔐 Autenticación Centralizada
            </h2>
            <div className="space-y-4 mb-8">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="ml-3 text-gray-700">Single Sign-On (SSO)</p>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="ml-3 text-gray-700">Gestión de roles y permisos</p>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="ml-3 text-gray-700">Tokens JWT seguros</p>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="ml-3 text-gray-700">Protección de rutas del backend</p>
              </div>
            </div>
            <div className="text-center">
              <Link
                href="/auth/signin"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition"
              >
                Iniciar Sesión con Keycloak
              </Link>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold text-green-800 mb-2">
                ✅ Sesión Activa
              </h2>
              <p className="text-green-700">
                Has iniciado sesión exitosamente. Ahora puedes acceder a las áreas protegidas.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Link href="/dashboard">
                <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition cursor-pointer">
                  <h3 className="text-lg font-semibold mb-2">📊 Dashboard</h3>
                  <p className="text-gray-600">
                    Accede a tu panel de control personalizado
                  </p>
                </div>
              </Link>

              <Link href="/profile">
                <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition cursor-pointer">
                  <h3 className="text-lg font-semibold mb-2">👤 Perfil</h3>
                  <p className="text-gray-600">
                    Ve tu información de usuario y roles asignados
                  </p>
                </div>
              </Link>
            </div>
          </div>
        )}

        <div className="max-w-3xl mx-auto mt-12">
          <h3 className="text-2xl font-semibold mb-6 text-center">
            Usuarios de Prueba
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h4 className="font-semibold text-blue-900 mb-2">Usuario Regular</h4>
              <p className="text-sm text-blue-800">
                <strong>Username:</strong> user1<br />
                <strong>Password:</strong> password123<br />
                <strong>Rol:</strong> user
              </p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <h4 className="font-semibold text-purple-900 mb-2">Administrador</h4>
              <p className="text-sm text-purple-800">
                <strong>Username:</strong> admin-user<br />
                <strong>Password:</strong> admin123<br />
                <strong>Rol:</strong> admin
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
