// pages/profile.js
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import authClient from '../lib/auth';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      // Verificar autenticación
      if (!authClient.isAuthenticated()) {
        router.push('/auth/signin');
        return;
      }

      try {
        // Obtener información del usuario
        const userData = await authClient.getUser();
        setUser(userData);

        // Obtener datos del perfil del backend
        const response = await authClient.fetch(`${BACKEND_URL}/api/profile`);
        if (response.ok) {
          const data = await response.json();
          setProfileData(data.profile);
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <div className="px-4 py-8 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Mi Perfil</h1>

        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          <div className="flex items-center mb-6">
            <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {user.name?.charAt(0) || user.preferred_username?.charAt(0) || user.email?.charAt(0) || 'U'}
            </div>
            <div className="ml-6">
              <h2 className="text-2xl font-semibold text-gray-900">
                {user.name || user.preferred_username || 'Usuario'}
              </h2>
              <p className="text-gray-600">{user.email}</p>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">
              Información de la Sesión
            </h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="text-sm text-gray-900">{user.email || 'No disponible'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Nombre</dt>
                <dd className="text-sm text-gray-900">{user.name || 'No disponible'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Username</dt>
                <dd className="text-sm text-gray-900">{user.preferred_username || 'No disponible'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">ID de Usuario</dt>
                <dd className="text-sm text-gray-900 font-mono">{user.sub}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Token de Acceso</dt>
                <dd className="text-sm text-gray-900 font-mono truncate">
                  {authClient.getToken() ? `${authClient.getToken().substring(0, 30)}...` : 'No disponible'}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {profileData && (
          <div className="bg-white rounded-lg shadow-md p-8">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">
              Datos del Backend
            </h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">ID de Usuario</dt>
                <dd className="text-sm text-gray-900 font-mono">{profileData.id}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Username</dt>
                <dd className="text-sm text-gray-900">{profileData.username}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Roles Asignados</dt>
                <dd className="text-sm text-gray-900">
                  <div className="flex flex-wrap gap-2 mt-1">
                    {profileData.roles?.map((role) => (
                      <span
                        key={role}
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </dd>
              </div>
            </dl>
          </div>
        )}

        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-yellow-900 mb-2">
            ℹ️ Información
          </h4>
          <p className="text-sm text-yellow-800">
            Esta información proviene de tu token JWT emitido por Keycloak. Los roles determinan
            a qué endpoints del backend tienes acceso.
          </p>
        </div>
      </div>
    </Layout>
  );
}
