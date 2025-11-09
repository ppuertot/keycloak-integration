#!/bin/bash

# Script de inicio rápido para el proyecto OAuth2

echo "============================================"
echo "🚀 Iniciando proyecto Keycloak OAuth2"
echo "============================================"
echo ""

# Verificar si Docker está corriendo
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker no está corriendo. Por favor inicia Docker."
    exit 1
fi

# Verificar si las dependencias del backend están instaladas
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Instalando dependencias del backend..."
    cd backend
    npm install
    cd ..
fi

# Iniciar Keycloak
echo "🔐 Iniciando Keycloak..."
docker-compose up -d

# Esperar a que Keycloak esté listo
echo "⏳ Esperando a que Keycloak esté disponible..."
until $(curl --output /dev/null --silent --head --fail http://localhost:8080); do
    printf '.'
    sleep 5
done
echo ""
echo "✅ Keycloak está listo!"

# Ejecutar setup de Keycloak
echo "⚙️ Configurando Keycloak..."
if [ -f "setup-keycloak.sh" ]; then
    chmod +x setup-keycloak.sh
    ./setup-keycloak.sh
else
    echo "⚠️ No se encontró setup-keycloak.sh"
fi

echo ""
echo "============================================"
echo "✅ Configuración completada"
echo "============================================"
echo ""
echo "Ahora puedes iniciar los servidores:"
echo ""
echo "Terminal 1 - Backend:"
echo "  cd backend"
echo "  npm run dev"
echo ""
echo "Terminal 2 - Frontend:"
echo "  cd frontend"
echo "  npm install  # (si no lo has hecho)"
echo "  npm run dev"
echo ""
echo "URLs:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:4000"
echo "  Keycloak: http://localhost:8080/admin"
echo ""
echo "Usuarios de prueba:"
echo "  user1 / password123 (rol: user)"
echo "  admin-user / admin123 (rol: admin)"
echo ""
echo "============================================"
