// pages/auth/error.js
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import Link from 'next/link';

export default function AuthError() {
  const router = useRouter();
  const { error } = router.query;

  const errorMessages = {
    Configuration: 'Hay un problema con la configuración del servidor.',
    AccessDenied: 'No tienes permiso para acceder.',
    Verification: 'El token ha expirado o ya fue usado.',
    Default: 'Ocurrió un error durante la autenticación.',
  };

  const errorMessage = errorMessages[error] || errorMessages.Default;

  return (
    <Layout>
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <svg
              className="mx-auto h-16 w-16 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Error de Autenticación
          </h2>
          <p className="text-gray-600 mb-6">{errorMessage}</p>
          {error && (
            <p className="text-sm text-gray-500 mb-6">
              Código de error: <code className="bg-gray-100 px-2 py-1 rounded">{error}</code>
            </p>
          )}
          <Link
            href="/auth/signin"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition"
          >
            Intentar de nuevo
          </Link>
        </div>
      </div>
    </Layout>
  );
}
