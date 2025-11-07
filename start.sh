#!/bin/bash

# Script de Inicio Rápido
# Este script inicia todo el stack: Keycloak, Backend y Frontend

set -e

echo "=========================================="
echo "🚀 INICIO RÁPIDO - Keycloak Demo"
echo "=========================================="
echo ""

# Verificar si Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no está instalado. Por favor instala Docker primero."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose no está instalado. Por favor instala Docker Compose primero."
    exit 1
fi

# Verificar si Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado. Por favor instala Node.js primero."
    exit 1
fi

echo "✅ Dependencias verificadas"
echo ""

# 1. Iniciar Keycloak
echo "📦 Paso 1/5: Iniciando Keycloak con Docker..."
docker-compose up -d

echo "⏳ Esperando a que Keycloak esté listo (esto puede tardar 30-60 segundos)..."
sleep 10

# Esperar a que Keycloak esté disponible
until $(curl --output /dev/null --silent --head --fail http://localhost:8080); do
    printf '.'
    sleep 5
done
echo ""
echo "✅ Keycloak está activo"
echo ""

# 2. Configurar Keycloak
echo "⚙️  Paso 2/5: Configurando Keycloak..."
if [ -f "setup-keycloak.sh" ]; then
    chmod +x setup-keycloak.sh
    ./setup-keycloak.sh
else
    echo "⚠️  Advertencia: setup-keycloak.sh no encontrado. Configura Keycloak manualmente."
fi
echo ""

# 3. Instalar dependencias del backend
echo "📦 Paso 3/5: Instalando dependencias del backend..."
cd backend
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "✅ Dependencias del backend ya instaladas"
fi
cd ..
echo ""

# 4. Instalar dependencias del frontend
echo "📦 Paso 4/5: Instalando dependencias del frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "✅ Dependencias del frontend ya instaladas"
fi
cd ..
echo ""

# 5. Iniciar los servicios
echo "🚀 Paso 5/5: Iniciando servicios..."
echo ""

# Crear archivos PID para los procesos
BACKEND_PID_FILE="/tmp/keycloak-backend.pid"
FRONTEND_PID_FILE="/tmp/keycloak-frontend.pid"

# Limpiar PIDs anteriores si existen
rm -f $BACKEND_PID_FILE $FRONTEND_PID_FILE

# Iniciar backend en background
echo "Iniciando backend en http://localhost:4000..."
cd backend
npm run dev > /tmp/backend.log 2>&1 &
echo $! > $BACKEND_PID_FILE
cd ..

# Esperar un momento
sleep 3

# Iniciar frontend en background
echo "Iniciando frontend en http://localhost:3000..."
cd frontend
npm run dev > /tmp/frontend.log 2>&1 &
echo $! > $FRONTEND_PID_FILE
cd ..

# Esperar un momento para que los servicios inicien
sleep 5

echo ""
echo "=========================================="
echo "✅ TODO LISTO!"
echo "=========================================="
echo ""
echo "📊 URLs disponibles:"
echo "   Frontend:        http://localhost:3000"
echo "   Backend API:     http://localhost:4000"
echo "   Keycloak Admin:  http://localhost:8080/admin"
echo ""
echo "🔑 Credenciales de Keycloak Admin:"
echo "   Usuario:   admin"
echo "   Password:  admin123"
echo ""
echo "👤 Usuarios de prueba:"
echo "   1. user1 / password123 (rol: user)"
echo "   2. admin-user / admin123 (rol: admin)"
echo ""
echo "📝 Logs:"
echo "   Backend:  tail -f /tmp/backend.log"
echo "   Frontend: tail -f /tmp/frontend.log"
echo ""
echo "🛑 Para detener los servicios:"
echo "   kill \$(cat $BACKEND_PID_FILE) \$(cat $FRONTEND_PID_FILE)"
echo "   docker-compose down"
echo ""
echo "=========================================="
echo "Presiona Ctrl+C para ver los logs en tiempo real"
echo "=========================================="

# Mostrar logs en tiempo real
tail -f /tmp/backend.log /tmp/frontend.log
