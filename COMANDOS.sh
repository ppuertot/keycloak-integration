#!/bin/bash

# COMANDOS ÚTILES PARA KEYCLOAK + EXPRESS + NEXT.JS

echo "=========================================="
echo "COMANDOS ÚTILES"
echo "=========================================="
echo ""

# KEYCLOAK
echo "=== KEYCLOAK ==="
echo "Iniciar Keycloak:"
echo "  docker-compose up -d"
echo ""
echo "Ver logs de Keycloak:"
echo "  docker-compose logs -f keycloak"
echo ""
echo "Detener Keycloak:"
echo "  docker-compose down"
echo ""
echo "Reiniciar Keycloak:"
echo "  docker-compose restart"
echo ""
echo "Eliminar datos de Keycloak (cuidado!):"
echo "  docker-compose down -v"
echo ""

# BACKEND
echo "=== BACKEND ==="
echo "Instalar dependencias:"
echo "  cd backend && npm install"
echo ""
echo "Iniciar backend (desarrollo):"
echo "  cd backend && npm run dev"
echo ""
echo "Iniciar backend (producción):"
echo "  cd backend && npm start"
echo ""

# FRONTEND
echo "=== FRONTEND ==="
echo "Instalar dependencias:"
echo "  cd frontend && npm install"
echo ""
echo "Iniciar frontend (desarrollo):"
echo "  cd frontend && npm run dev"
echo ""
echo "Build para producción:"
echo "  cd frontend && npm run build"
echo ""
echo "Iniciar frontend (producción):"
echo "  cd frontend && npm start"
echo ""

# TESTING
echo "=== TESTING CON CURL ==="
echo "Obtener token de acceso (user1):"
echo '  curl -X POST "http://localhost:8080/realms/myapp-realm/protocol/openid-connect/token" \'
echo '    -H "Content-Type: application/x-www-form-urlencoded" \'
echo '    -d "username=user1" \'
echo '    -d "password=password123" \'
echo '    -d "grant_type=password" \'
echo '    -d "client_id=myapp-client" \'
echo '    -d "client_secret=myapp-secret-key-12345"'
echo ""
echo "Guardar token en variable:"
echo '  TOKEN=$(curl -s -X POST "http://localhost:8080/realms/myapp-realm/protocol/openid-connect/token" \'
echo '    -H "Content-Type: application/x-www-form-urlencoded" \'
echo '    -d "username=user1" \'
echo '    -d "password=password123" \'
echo '    -d "grant_type=password" \'
echo '    -d "client_id=myapp-client" \'
echo '    -d "client_secret=myapp-secret-key-12345" | jq -r ".access_token")'
echo ""
echo "Llamar endpoint protegido:"
echo '  curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/protected'
echo ""
echo "Llamar endpoint de usuarios:"
echo '  curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/users'
echo ""
echo "Llamar endpoint de admin (fallará con user1):"
echo '  curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/admin'
echo ""

# VERIFICACIÓN
echo "=== VERIFICACIÓN ==="
echo "Verificar que Keycloak está corriendo:"
echo "  curl http://localhost:8080"
echo ""
echo "Verificar que el backend está corriendo:"
echo "  curl http://localhost:4000/api/health"
echo ""
echo "Ver configuración de OpenID Connect:"
echo "  curl http://localhost:8080/realms/myapp-realm/.well-known/openid-configuration | jq"
echo ""

# LIMPIEZA
echo "=== LIMPIEZA ==="
echo "Limpiar node_modules:"
echo "  rm -rf backend/node_modules frontend/node_modules"
echo ""
echo "Limpiar datos de Docker:"
echo "  docker-compose down -v"
echo ""

echo "=========================================="
