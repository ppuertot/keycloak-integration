// pages/dashboard.js
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import authClient from '../lib/auth';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [apiData, setApiData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      if (!authClient.isAuthenticated()) {
        router.push('/auth/signin');
        return;
      }

      const userData = await authClient.getUser();
      setUser(userData);
    };

    loadUser();
  }, []);

  const fetchProtectedData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authClient.fetch(`${BACKEND_URL}/api/protected`);
      const data = await response.json();
      setApiData(data);
    } catch (err) {
      setError(err.message || 'Error al conectar con el backend');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authClient.fetch(`${BACKEND_URL}/api/users`);
      const data = await response.json();
      setApiData(data);
    } catch (err) {
      setError(err.message || 'Error al conectar con el backend');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authClient.fetch(`${BACKEND_URL}/api/admin`);
      const data = await response.json();
      setApiData(data);
    } catch (err) {
      setError(err.message || 'Error al conectar con el backend');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-2 text-gray-900">Bienvenido</h3>
            <p className="text-gray-600">{user.name || user.preferred_username || user.email}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-2 text-gray-900">Estado</h3>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              Conectado
            </span>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-2 text-gray-900">Token</h3>
            <p className="text-gray-600 text-sm truncate">
              {authClient.getToken() ? '✓ Token activo' : '✗ Sin token'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Probar API del Backend</h2>
          <p className="text-gray-600 mb-4">
            Estos botones llaman a endpoints protegidos del backend Express usando tu token JWT
          </p>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={fetchProtectedData}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md font-medium transition disabled:opacity-50"
            >
              Llamar /api/protected
            </button>
            <button
              onClick={fetchUserData}
              disabled={loading}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md font-medium transition disabled:opacity-50"
            >
              Llamar /api/users (rol: user)
            </button>
            <button
              onClick={fetchAdminData}
              disabled={loading}
              className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-md font-medium transition disabled:opacity-50"
            >
              Llamar /api/admin (rol: admin)
            </button>
          </div>

          {loading && (
            <div className="mt-4 flex items-center text-blue-600">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
              Cargando...
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-medium">Error:</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {apiData && !error && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-medium mb-2">Respuesta del Backend:</p>
              <pre className="text-sm text-green-700 overflow-x-auto">
                {JSON.stringify(apiData, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">💡 Consejo</h3>
          <p className="text-blue-800">
            Intenta llamar al endpoint de admin con el usuario <strong>user1</strong> y verás un error de permisos.
            Luego cierra sesión e inicia con <strong>admin-user</strong> para tener acceso completo.
          </p>
        </div>
      </div>
    </Layout>
  );
}
